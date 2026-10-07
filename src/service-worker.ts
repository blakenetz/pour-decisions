/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

import { build, files, version } from '$service-worker'

const sw = self as unknown as ServiceWorkerGlobalScope

// One cache per deploy: a new build installs a new worker with a new cache, and activation drops
// the previous one.
const CACHE = `pour-decisions-${version}`

/** Hashed build output plus `static/`: identical for every user and safe to serve cache-first. */
const PRECACHE = new Set([...build, ...files])

const OFFLINE_PAGE = '/offline.html'

sw.addEventListener('install', (event) => {
	// No skipWaiting here: an update waits until the page accepts it (SKIP_WAITING below), so an
	// open tab never has its assets swapped mid-session.
	event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll([...PRECACHE])))
})

sw.addEventListener('activate', (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) =>
				Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))
			)
	)
})

sw.addEventListener('fetch', (event) => {
	const { request } = event
	if (request.method !== 'GET') return

	const url = new URL(request.url)
	if (url.origin !== sw.location.origin) return

	if (PRECACHE.has(url.pathname)) {
		event.respondWith(caches.match(url.pathname).then((cached) => cached ?? fetch(request)))
		return
	}

	// Pages are per-user and must be fresh, so they are never cached; offline, show the fallback.
	if (request.mode === 'navigate') {
		event.respondWith(
			fetch(request).catch(async () => (await caches.match(OFFLINE_PAGE)) ?? Response.error())
		)
	}

	// Everything else (load data via __data.json, /api/*) goes straight to the network: caching it
	// would serve stale, and on shared devices another user's, data.
})

sw.addEventListener('message', (event) => {
	if (event.data?.type === 'SKIP_WAITING') sw.skipWaiting()
})
