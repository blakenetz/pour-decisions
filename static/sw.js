const CACHE_NAME = 'pour-decisions-cache-v1'
const PRECACHE_URLS = ['/', '/offline.html', '/favicon.svg', '/manifest.webmanifest']

self.addEventListener('install', (event) => {
	self.skipWaiting()
	event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)))
})

self.addEventListener('activate', (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) =>
				Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
			)
	)
})

self.addEventListener('fetch', (event) => {
	// navigation requests: return cached offline page when offline
	if (event.request.mode === 'navigate') {
		event.respondWith(
			fetch(event.request)
				.then((res) => {
					// put fresh navigation responses in the cache
					const copy = res.clone()
					caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy))
					return res
				})
				.catch(() => caches.match('/offline.html'))
		)
		return
	}

	// for other requests, try cache first, then network
	event.respondWith(
		caches.match(event.request).then((cached) => {
			if (cached) return cached
			return fetch(event.request)
				.then((res) => {
					// only cache GET and successful responses
					if (
						event.request.method === 'GET' &&
						res &&
						res.status === 200 &&
						res.type !== 'opaque'
					) {
						const copy = res.clone()
						caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy))
					}
					return res
				})
				.catch(() => {
					// fallback for images or other assets could be added here
				})
		})
	)
})

// simple message handler to trigger skipWaiting from the page
self.addEventListener('message', (event) => {
	if (event.data && event.data.type === 'SKIP_WAITING') {
		self.skipWaiting()
	}
})
