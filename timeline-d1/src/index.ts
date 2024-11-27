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
	'Access-Control-Max-Age': '86400'
}

export default {
	async fetch(request): Promise<Response> {
		const data = [
			{
				title: 'Germany invades Poland',
				description: 'On August 25, 1939, the aging German pre-dreadnought battleship Schleswig-Holstein arrived in the port of the Free City of Danzig',
				main_tag: 'war',
				tags: ['germany', 'poland', 'war'],
				date: '9/1/1939'
			},
			{
				title: 'Warsaw Ghetto Uprising',
				description: 'The Warsaw Ghetto Uprising was the 1943 act of Jewish resistance in the Warsaw Ghetto in German-occupied Poland during World War II',
				main_tag: 'jewish resistance',
				tags: ['warsaw', 'ghetto', 'jewish resistance'],
				date: '4/19/1943',
				image: 'https://www.yadvashem.org/sites/default/files/styles/main_image_1block/public/1_131.jpg?itok=R91sI_sA'
			},
			{
				title: 'establishment of aweshwitz',
				description: 'On January 20, 1942, Reinhard Heydrich, Himmler’s second in command of the SS, convened the Wannsee Conference in Berlin with 15 top',
				main_tag: 'holocaust',
				tags: ['aweshwitz', 'holocaust', 'poland'],
				date: '1/20/1942'
			}
		]

		return Response.json(data, { headers: corsHeaders })
	}
} satisfies ExportedHandler
