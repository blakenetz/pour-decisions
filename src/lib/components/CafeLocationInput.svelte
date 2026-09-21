<script lang="ts">
import type { Attachment } from 'svelte/attachments'
import { browser } from '$app/environment'
import { env } from '$env/dynamic/public'
import { loadGoogleMapsPlaces } from '$lib/maps/googleMapsLoader'

let placesReady = $state(false)
let loadFailed = $state(false)
let manualText = $state('')

let name = $state('')
let address = $state('')
let lat: number | undefined = $state(undefined)
let lng: number | undefined = $state(undefined)

const setupAutocomplete: Attachment = (container) => {
	if (!browser) return

	const apiKey = env.PUBLIC_GOOGLE_MAPS_API_KEY
	if (!apiKey) {
		if (import.meta.env.DEV) {
			console.warn(
				'PUBLIC_GOOGLE_MAPS_API_KEY is not set — falling back to a plain text field for pour location. See .env.example.'
			)
		}
		return
	}

	let cancelled = false

	loadGoogleMapsPlaces(apiKey)
		.then(({ PlaceAutocompleteElement }) => {
			if (cancelled) return
			const autocomplete = new PlaceAutocompleteElement()
			autocomplete.style.width = '100%'
			container.appendChild(autocomplete)

			autocomplete.addEventListener('gmp-select', async (event) => {
				const place = event.placePrediction.toPlace()
				await place.fetchFields({ fields: ['displayName', 'formattedAddress', 'location'] })
				name = place.displayName ?? ''
				address = place.formattedAddress ?? ''
				lat = place.location?.lat()
				lng = place.location?.lng()
			})

			placesReady = true
		})
		.catch(() => {
			if (!cancelled) loadFailed = true
		})

	return () => {
		cancelled = true
	}
}

function handleManualInput() {
	name = manualText
	address = ''
	lat = undefined
	lng = undefined
}
</script>

<div>
	<input type="hidden" name="locationName" value={name} />
	<input type="hidden" name="locationAddress" value={address} />
	<input type="hidden" name="locationLat" value={lat ?? ''} />
	<input type="hidden" name="locationLng" value={lng ?? ''} />

	<div {@attach setupAutocomplete} class:hidden={!placesReady}></div>

	{#if !placesReady}
		<input
			type="text"
			bind:value={manualText}
			oninput={handleManualInput}
			placeholder="Where'd you go? e.g. Blue Bottle Coffee"
			class="w-full border-b border-dark-ink bg-transparent py-2 focus:outline-none placeholder:text-gray-300"
		/>
		{#if loadFailed}
			<p class="text-xs text-gray-400 mt-1">Location search unavailable — type it manually.</p>
		{/if}
	{/if}
</div>
