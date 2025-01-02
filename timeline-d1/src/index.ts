/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.toml`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */
const corsHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET,HEAD,PUT,POST,OPTIONS',
	'Access-Control-Max-Age': '86400',
	'Access-Control-Allow-Headers': 'Content-Type'
}

export default {
	async fetch(request, env): Promise<Response> {
		if (request.method === 'OPTIONS') {
			return new Response(null, { headers: corsHeaders })
		}
		if (request.method === 'PUT') {
			// UPDATE EVENT
			if (request.url.includes('/update-event')) {
				let { name, description, start_date, end_date, embed_link, main_tag_id, tags, new_main_tag, new_tags } = await request.json()
				const id = request.url.split('/').pop()

				const idsObj = await getNewTagIds(env, new_main_tag, main_tag_id, new_tags)
				main_tag_id = idsObj.main_tag_id
				const new_tags_ids = idsObj.new_tags_ids

				const data = await env.DB.prepare(`update events set name = ?, description = ?, start_date = ?, end_date = ?, embed_link = ?, main_tag_id = ? where id = ?`)
					.bind(name, description, start_date, end_date || null, embed_link || null, main_tag_id, id)
					.run()

				const event_id = id
				// delete all tags from event_tags
				await env.DB.prepare(`DELETE FROM event_tags WHERE event_id = ?`).bind(event_id).run()

				// add tags to event_tags
				addTagsToEventTags(env, event_id, tags, new_tags_ids)

				if (data.success) {
					return new Response('ok', { headers: corsHeaders })
				} else {
					return new Response('event was not updated', { headers: corsHeaders })
				}
			}
		}
		if (request.method === 'POST') {
			// CREATE NEW EVENT
			if (request.url.includes('/create-new-event')) {
				// creating new tag for created main tag if needed
				let { name, description, start_date, end_date, image, embed_link, main_tag_id, tags, new_main_tag, new_tags } = await request.json()

				const idsObj = await getNewTagIds(env, new_main_tag, main_tag_id, new_tags)
				main_tag_id = idsObj.main_tag_id
				const new_tags_ids = idsObj.new_tags_ids

				// creating new event
				const data = await env.DB.prepare(`insert into events (name, description, start_date, end_date, image, embed_link, main_tag_id) values (?, ?, ?, ?, ?, ?, ?)`)
					.bind(name, description, start_date, end_date || null, image || null, embed_link || null, main_tag_id)
					.run()

				// get the created event ID
				const event_id = data.meta.last_row_id

				// add tags to event_tags
				addTagsToEventTags(env, event_id, tags, new_tags_ids)

				if (data.success) {
					return new Response('ok', { headers: corsHeaders })
				} else {
					return new Response('event was not created', { headers: corsHeaders })
				}
			} else {
				// UPLOAD IMAGE TO CLOUDFLARE KV AND RETURN IMAGE ID
				const form = await request.formData()
				const image = form.get('image')
				const id = crypto.randomUUID()
				await env.IMAGES.put(id, image.stream())

				return Response.json({ image_id: id }, { headers: corsHeaders })
			}
		} else {
			// GET IMAGE
			if (request.url.includes('/image')) {
				const image_id = request.url.split('/').pop()
				const image = await env.IMAGES.get(image_id, { type: 'stream' })

				return new Response(image, {
					headers: { 'Content-Type': 'image/jpeg' }
				})
			} else if (request.url.includes('/tags')) {
				// GET TAGS
				const { results, success } = await env.DB.prepare(`select * from tags`).bind().all()

				if (success) {
					return Response.json(results, { headers: corsHeaders })
				} else {
					return new Response('cannot get tags', { headers: corsHeaders })
				}
			} else if (request.url.includes('/event/')) {
				// GET EVENT BY ID
				const event_id = request.url.split('/').pop()
				const { results, success } = await env.DB.prepare(
					`SELECT
    e.*,
    GROUP_CONCAT(et.tag_id) AS tags
FROM
    events e
LEFT JOIN
    event_tags et ON e.id = et.event_id
WHERE
    e.id = ?
GROUP BY
    e.id;`
				)
					.bind(event_id)
					.all()
				//SELECT * FROM events WHERE id = ?;
				if (success) {
					return Response.json(results, { headers: corsHeaders })
				} else {
					return new Response('cannot get event', { headers: corsHeaders })
				}
			} else {
				// GET EVENTS
				const { results, success } = await env.DB.prepare(
					`SELECT events.*,
  GROUP_CONCAT(event_tags.tag_id) AS tags
FROM
  events
LEFT JOIN
  event_tags ON events.id = event_tags.event_id
GROUP BY
  events.id;`
				)
					.bind()
					.all()

				if (success) {
					return Response.json(results, { headers: corsHeaders })
				} else {
					return new Response('cannot get events', { headers: corsHeaders })
				}
			}
		}
	}
} satisfies ExportedHandler

const createNewTag = async (env, newTag) => {
	const createdMainTagData = await env.DB.prepare(`insert into tags (name) values (?)`).bind(newTag).run()
	return createdMainTagData.meta.last_row_id
}

const getTagId = async (env, tag) => {
	const { results } = await env.DB.prepare(`select id from tags where name = ?`).bind(tag).run()
	return results[0].id
}

const getNewTagIds = async (env, new_main_tag, main_tag_id, new_tags) => {
	let main_tag_id_to_override = main_tag_id
	if (new_main_tag) {
		try {
			main_tag_id_to_override = await createNewTag(env, new_main_tag)
		} catch (e) {
			main_tag_id_to_override = await getTagId(env, new_main_tag)
		}
	}

	let new_tags_ids = []
	if (new_tags) {
		for (const tag of new_tags) {
			try {
				new_tags_ids.push(await createNewTag(env, tag))
			} catch (e) {
				new_tags_ids.push(await getTagId(env, tag))
			}
		}
	}

	return { main_tag_id: main_tag_id_to_override, new_tags_ids }
}

const addTagsToEventTags = async (env, event_id, tags, new_tags_ids) => {
	const allTags = [...tags, ...new_tags_ids]
	for (const tag_id of allTags) {
		const eventTagsData = await env.DB.prepare(`INSERT INTO event_tags (event_id, tag_id) values (?, ?)`).bind(event_id, tag_id).run()
		if (!eventTagsData.success) {
			return new Response('event tags were not created', { headers: corsHeaders })
		}
	}
}
