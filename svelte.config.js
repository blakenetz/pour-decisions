import adapter from '@sveltejs/adapter-node'
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: vitePreprocess(),

	kit: {
		// adapter-node's server runs on AWS Lambda behind Lambda Web Adapter (see infra/lib/web-stack.ts).
		// Static files are served from S3 via CloudFront, which compresses them itself.
		adapter: adapter({ precompress: false }),
		// src/routes/+layout.svelte registers the worker itself to drive the update prompt.
		serviceWorker: { register: false }
	}
}

export default config
