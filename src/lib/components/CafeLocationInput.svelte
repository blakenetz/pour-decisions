<script lang="ts">
/**
 * Location typeahead for the "Log a Pour" form, shown when the pour happened
 * away from home. Searches named commercial venues (cafes, coffee shops,
 * restaurants, bakeries, bars) via Komoot's public Photon geocoder — no API
 * key, no billing account. Results without a name (plain addresses, streets,
 * residential buildings) are dropped so only real venues surface.
 *
 * On select it fills four hidden inputs consumed by the form action:
 * `locationName`, `locationAddress`, `locationLat`, `locationLng`. Free text
 * that never matches a suggestion still submits as `locationName`.
 */

const PHOTON_URL = 'https://photon.komoot.io/api/'

/** OSM `key:value` tags Photon should restrict results to — named commercial
 *  venues where you'd plausibly drink coffee. */
const VENUE_TAGS = [
	'amenity:cafe',
	'amenity:restaurant',
	'amenity:fast_food',
	'amenity:bar',
	'amenity:pub',
	'shop:coffee',
	'shop:tea',
	'shop:bakery',
	'shop:pastry',
	'shop:deli'
]

const MIN_QUERY_LENGTH = 3
const DEBOUNCE_MS = 250
const RESULT_LIMIT = 6

type PhotonFeature = {
	geometry: { coordinates: [number, number] }
	properties: {
		name?: string
		housenumber?: string
		street?: string
		postcode?: string
		city?: string
		state?: string
		country?: string
		osm_type?: string
		osm_id?: number
	}
}

type Suggestion = {
	key: string
	name: string
	address: string
	lat: number
	lng: number
}

let query = $state('')
let suggestions = $state<Suggestion[]>([])
let activeIndex = $state(-1)
let open = $state(false)
let loadFailed = $state(false)

let name = $state('')
let address = $state('')
let lat: number | undefined = $state(undefined)
let lng: number | undefined = $state(undefined)

let debounceTimer: ReturnType<typeof setTimeout> | undefined
let controller: AbortController | undefined
let blurTimer: ReturnType<typeof setTimeout> | undefined

const listboxId = 'cafe-location-suggestions'

function toSuggestion(feature: PhotonFeature): Suggestion | null {
	const p = feature.properties
	if (!p.name) return null

	const [featLng, featLat] = feature.geometry.coordinates
	const regionLine = [p.postcode, p.city].filter(Boolean).join(' ')
	const address = [[p.housenumber, p.street].filter(Boolean).join(' '), regionLine, p.state, p.country]
		.filter(Boolean)
		.join(', ')

	return {
		key: `${p.osm_type ?? ''}${p.osm_id ?? ''}:${featLat},${featLng}`,
		name: p.name.slice(0, 200),
		address: address.slice(0, 300),
		lat: featLat,
		lng: featLng
	}
}

async function search(term: string) {
	controller?.abort()
	controller = new AbortController()

	const params = new URLSearchParams({ q: term, limit: String(RESULT_LIMIT), lang: 'en' })
	for (const tag of VENUE_TAGS) params.append('osm_tag', tag)

	try {
		const res = await fetch(`${PHOTON_URL}?${params}`, { signal: controller.signal })
		if (!res.ok) throw new Error(`Photon responded ${res.status}`)
		const data = (await res.json()) as { features: PhotonFeature[] }

		suggestions = data.features.map(toSuggestion).filter((s): s is Suggestion => s !== null)
		activeIndex = -1
		open = suggestions.length > 0
		loadFailed = false
	} catch (err) {
		if (err instanceof DOMException && err.name === 'AbortError') return
		suggestions = []
		open = false
		loadFailed = true
	}
}

function handleInput() {
	// Free text is the fallback venue name until a suggestion is chosen.
	name = query
	address = ''
	lat = undefined
	lng = undefined

	clearTimeout(debounceTimer)
	const term = query.trim()
	if (term.length < MIN_QUERY_LENGTH) {
		controller?.abort()
		suggestions = []
		open = false
		return
	}

	debounceTimer = setTimeout(() => search(term), DEBOUNCE_MS)
}

function select(suggestion: Suggestion) {
	query = suggestion.name
	name = suggestion.name
	address = suggestion.address
	lat = suggestion.lat
	lng = suggestion.lng

	suggestions = []
	activeIndex = -1
	open = false
}

function handleKeydown(event: KeyboardEvent) {
	if (!open || suggestions.length === 0) return

	switch (event.key) {
		case 'ArrowDown':
			event.preventDefault()
			activeIndex = (activeIndex + 1) % suggestions.length
			break
		case 'ArrowUp':
			event.preventDefault()
			activeIndex = activeIndex <= 0 ? suggestions.length - 1 : activeIndex - 1
			break
		case 'Enter':
			if (activeIndex >= 0) {
				event.preventDefault()
				select(suggestions[activeIndex])
			}
			break
		case 'Escape':
			open = false
			activeIndex = -1
			break
	}
}

function handleBlur() {
	// Delay so a pointer selection lands before the list closes.
	blurTimer = setTimeout(() => {
		open = false
	}, 150)
}

$effect(() => {
	return () => {
		clearTimeout(debounceTimer)
		clearTimeout(blurTimer)
		controller?.abort()
	}
})
</script>

<div class="relative">
	<input type="hidden" name="locationName" value={name} />
	<input type="hidden" name="locationAddress" value={address} />
	<input type="hidden" name="locationLat" value={lat ?? ''} />
	<input type="hidden" name="locationLng" value={lng ?? ''} />

	<input
		type="text"
		role="combobox"
		aria-expanded={open}
		aria-controls={listboxId}
		aria-autocomplete="list"
		autocomplete="off"
		bind:value={query}
		oninput={handleInput}
		onkeydown={handleKeydown}
		onfocus={() => {
			if (suggestions.length > 0) open = true
		}}
		onblur={handleBlur}
		placeholder="Where'd you go? e.g. Blue Bottle Coffee"
		class="w-full border-b border-dark-ink bg-transparent py-2 focus:outline-none placeholder:text-gray-300"
	/>

	{#if open}
		<ul
			id={listboxId}
			role="listbox"
			class="absolute z-10 mt-1 w-full overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg"
		>
			{#each suggestions as suggestion, index (suggestion.key)}
				<li role="option" aria-selected={index === activeIndex}>
					<button
						type="button"
						onmousedown={(event) => {
							event.preventDefault()
							select(suggestion)
						}}
						onmouseenter={() => {
							activeIndex = index
						}}
						class="flex w-full flex-col px-3 py-2 text-left hover:bg-gray-50"
						class:bg-gray-50={index === activeIndex}
					>
						<span class="text-sm text-dark-ink">{suggestion.name}</span>
						{#if suggestion.address}
							<span class="text-xs text-gray-400">{suggestion.address}</span>
						{/if}
					</button>
				</li>
			{/each}
		</ul>
	{/if}

	{#if loadFailed}
		<p class="mt-1 text-xs text-gray-400">Venue search unavailable — type it manually.</p>
	{/if}
</div>
