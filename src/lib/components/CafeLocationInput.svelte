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
 *
 * Venues the taster has logged before show as one-tap chips, and searches lean
 * toward the most recent one that has coordinates, so a chain name finds the
 * nearby branch without asking for location permission.
 */

import { untrack } from 'svelte'
import type { PastVenue } from '$lib/past-pours'
import ClearButton from './ClearButton.svelte'

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

let {
	initial,
	recent = []
}: {
	/** Venue to start from, e.g. when repeating a pour at the same cafe. Read once on mount. */
	initial?: PastVenue
	/** Venues from earlier pours, most recent first. */
	recent?: readonly PastVenue[]
} = $props()

const seed = untrack(() => initial)

let query = $state(seed?.name ?? '')
let suggestions = $state<Suggestion[]>([])
let activeIndex = $state(-1)
let open = $state(false)
let loadFailed = $state(false)

let name = $state(seed?.name ?? '')
let address = $state(seed?.address ?? '')
let lat: number | undefined = $state(seed?.lat)
let lng: number | undefined = $state(seed?.lng)

const near = $derived(recent.find((venue) => venue.lat !== undefined && venue.lng !== undefined))

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
	if (near?.lat !== undefined && near.lng !== undefined) {
		params.set('lat', String(near.lat))
		params.set('lon', String(near.lng))
	}

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

function select(venue: PastVenue) {
	query = venue.name
	name = venue.name
	address = venue.address ?? ''
	lat = venue.lat
	lng = venue.lng

	suggestions = []
	activeIndex = -1
	open = false
}

function clear() {
	controller?.abort()
	clearTimeout(debounceTimer)
	query = ''
	name = ''
	address = ''
	lat = undefined
	lng = undefined
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

<div class="flex flex-col gap-3">
	<input type="hidden" name="locationName" value={name} />
	<input type="hidden" name="locationAddress" value={address} />
	<input type="hidden" name="locationLat" value={lat ?? ''} />
	<input type="hidden" name="locationLng" value={lng ?? ''} />

	<div class="relative">
		<div class="relative">
			<input
				type="text"
				role="combobox"
				aria-label="Cafe or venue"
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
				placeholder="Search cafes, e.g. Blue Bottle Coffee"
				class="w-full border-b border-dark-ink bg-transparent py-2 pr-10 focus:outline-none placeholder:text-gray-300"
			/>
			<!-- Inside the field's right edge, so the input keeps the full width of the fields above. -->
			<span class="absolute inset-y-0 right-3 flex items-center">
				<ClearButton label="venue" active={query !== ''} onclick={clear} />
			</span>
		</div>
		{#if address}
			<p class="mt-1 text-xs text-gray-400">{address}</p>
		{/if}

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
							class="flex min-h-11 w-full flex-col justify-center px-3 py-2 text-left hover:bg-gray-50"
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
	</div>

	{#if recent.length > 0 && name === ''}
		<div class="flex flex-col gap-2">
			<span class="text-[10px] uppercase tracking-widest text-gray-400">Recent</span>
			<!-- One row like the choice pills: scrolls sideways on phones instead of wrapping. -->
			<div
				class="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden"
			>
				{#each recent as venue (`${venue.name}|${venue.address ?? ''}`)}
					<button
						type="button"
						title={venue.address}
						onclick={() => select(venue)}
						class="min-h-11 min-w-11 shrink-0 whitespace-nowrap rounded-full border border-dashed border-dark-ink px-3 py-2 text-sm text-dark-ink"
					>
						{venue.name}
					</button>
				{/each}
			</div>
		</div>
	{/if}

	{#if loadFailed}
		<p class="text-xs text-gray-400">Venue search unavailable — type it manually.</p>
	{/if}
</div>
