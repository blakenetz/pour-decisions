/// <reference types="google.maps" />

/**
 * Loads the Google Maps JavaScript API's `places` library on demand.
 *
 * Uses the standard `<script src=".../js?...&loading=async&callback=...">` pattern
 * (Google's other officially documented loading method, alongside the inline
 * bootstrap snippet) so the script tag itself stays plain and readable. Caches the
 * in-flight promise at module scope so concurrent callers (e.g. multiple
 * `CafeLocationInput` instances) share a single script load.
 */

type PlacesLibrary = {
	PlaceAutocompleteElement: typeof google.maps.places.PlaceAutocompleteElement
}

const CALLBACK_NAME = '__pourDecisionsGoogleMapsLoaded'

let loadPromise: Promise<void> | null = null

function loadScript(apiKey: string): Promise<void> {
	if (window.google?.maps) return Promise.resolve()
	if (loadPromise) return loadPromise

	const { promise, resolve, reject } = Promise.withResolvers<void>()
	loadPromise = promise

	const params = new URLSearchParams({
		key: apiKey,
		loading: 'async',
		callback: CALLBACK_NAME
	})
	const script = document.createElement('script')
	script.src = `https://maps.googleapis.com/maps/api/js?${params}`
	script.async = true
	;(window as unknown as Record<string, () => void>)[CALLBACK_NAME] = () => resolve()
	script.onerror = () => {
		loadPromise = null
		reject(new Error('Failed to load the Google Maps script'))
	}
	document.head.appendChild(script)

	return promise
}

export async function loadGoogleMapsPlaces(apiKey: string): Promise<PlacesLibrary> {
	await loadScript(apiKey)
	return (await google.maps.importLibrary('places')) as unknown as PlacesLibrary
}
