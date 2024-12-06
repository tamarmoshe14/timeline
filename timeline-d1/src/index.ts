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
	'Access-Control-Allow-Methods': 'GET,HEAD,POST,OPTIONS',
	'Access-Control-Max-Age': '86400',
	'Access-Control-Allow-Headers': 'Content-Type'
}

export default {
	async fetch(request, env): Promise<Response> {
		if (request.method === 'OPTIONS') {
			return new Response(null, { headers: corsHeaders })
		}
		if (request.method === 'POST') {
			// CREATE NEW EVENT
			if (request.url.includes('/create-new-event')) {
				// creating new tag for created main tag if needed
				let { name, description, start_date, end_date, image, embed_link, main_tag_id, tags, new_main_tag, new_tags } = await request.json()

				if (new_main_tag) {
					try {
						main_tag_id = await createNewTag(env, new_main_tag)
					} catch (e) {
						main_tag_id = await getTagId(env, new_main_tag)
					}
				}

				// creating new tags for created tags
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

				// creating new event
				const data = await env.DB.prepare(`insert into events (name, description, start_date, end_date, image, embed_link, main_tag_id) values (?, ?, ?, ?, ?, ?, ?)`)
					.bind(name, description, start_date, end_date || null, image || null, embed_link || null, main_tag_id)
					.run()

				// get the created event ID
				const event_id = data.meta.last_row_id

				// create new entries in event_tags
				const allTags = [...tags, ...new_tags_ids]
				for (const tag_id of allTags) {
					const eventTagsData = await env.DB.prepare(`INSERT INTO event_tags (event_id, tag_id) values (?, ?)`).bind(event_id, tag_id).run()
					if (!eventTagsData.success) {
						return new Response('event tags were not created', { headers: corsHeaders })
					}
				}

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
