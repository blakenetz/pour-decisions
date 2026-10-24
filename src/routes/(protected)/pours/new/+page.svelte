<script lang="ts">
import { enhance } from '$app/forms'
import { resolve } from '$app/paths'
import { Flowers, RatingRow } from '$lib'
import AppHeader from '$lib/components/AppHeader.svelte'
import BrewTimeInput from '$lib/components/BrewTimeInput.svelte'
import CafeLocationInput from '$lib/components/CafeLocationInput.svelte'
import ChoicePills from '$lib/components/ChoicePills.svelte'
import FormSection from '$lib/components/FormSection.svelte'
import GrindInput from '$lib/components/GrindInput.svelte'
import PastCoffeeInput from '$lib/components/PastCoffeeInput.svelte'
import TagInput from '$lib/components/TagInput.svelte'
import type { PastCoffee, PastVenue } from '$lib/past-pours'
import {
	BREW_METHODS,
	BREWED_DRINKS,
	COUNTRIES,
	ESPRESSO_DRINKS,
	FLAVOR_NOTES,
	impliedBrewMethod,
	PROCESSES
} from '$lib/types/coffee'
import type { GrinderId } from '$lib/types/grinders'
import type { TastingDetails } from '$lib/types/tasting'
import type { ActionData, PageData } from './$types'

let { data, form }: { data: PageData; form: ActionData } = $props()

// The taster's saved brew setup (Profile). Never applied on load: only the "My defaults" autofill
// fills it in, so every value on a pour is one the taster chose to put there.
const defaults = $derived(data.defaults)
const hasDefaults = $derived(Object.values(defaults).some((value) => value !== undefined))
let defaultsApplied = $state(false)

// Required up-front fields are bound so we can validate before submitting.
let productName = $state('')
let roaster = $state('')
let drinkStyle = $state('')
let brewMethod = $state('')
let overallRating = $state(0)

let roastLevel = $state(0)
let location = $state('home')
let beanProcess = $state('')
// Coffee identity fields are bound so picking a past coffee can fill them.
let country = $state('')
let region = $state('')
let roastDate = $state('')
let roasterNotes: string[] = $state([])
let tasterNotes: string[] = $state([])
let coffeeOpen = $state(false)
// Where the last fill came from, for the "Filled from your pour on …" note.
let filledFrom: { brewed: string; roastDate?: string } | null = $state(null)
let fragranceIntensity = $state(0)
let aromaIntensity = $state(0)
let aromaClarity = $state(0)
let flavorComplexity = $state(0)
let flavorSweetness = $state(0)
let acidityIntensity = $state(0)
let acidityQuality = $state(0)
let bodyWeight = $state(0)
let bodyTactile = $state(0)
let finishFlavor = $state(0)
let finishLength = $state(0)
let brewDate = $state(new Date().toISOString().slice(0, 10))
let wouldBuyAgain = $state('')
let submitting = $state(false)
let clientError = $state('')

// Brew setup fields are bound so the autofills can fill them.
let grinder: GrinderId | '' = $state('')
let grindSetting = $state('')
let grindSize = $state('')
let coffeeGrams: number | null = $state(null)
let waterGrams: number | null = $state(null)
let waterTempF: number | null = $state(null)
let brewTimeSeed: number | undefined = $state(undefined)
// BrewTimeInput keeps its own min/sec state; bumping this remounts it with the new seed.
let brewTimeVersion = $state(0)
let brewOpen = $state(false)
// CafeLocationInput holds its own state; bumping the version remounts it with a new seed.
let cafeSeed: PastVenue | undefined = $state(undefined)
let cafeVersion = $state(0)

type BrewSetup = Pick<
	TastingDetails,
	| 'brewMethod'
	| 'location'
	| 'grinder'
	| 'grindSetting'
	| 'grindSize'
	| 'coffeeGrams'
	| 'waterGrams'
	| 'waterTempF'
	| 'brewTimeSeconds'
>

type CoffeeFields = Pick<
	TastingDetails,
	| 'roaster'
	| 'productName'
	| 'country'
	| 'region'
	| 'process'
	| 'roastLevel'
	| 'roasterNotes'
	| 'roastDate'
>

/** Fills every brew setup field `setup` has (overwriting what's there) and leaves the rest. */
function fillBrewSetup(setup: BrewSetup) {
	if (setup.brewMethod) brewMethod = setup.brewMethod
	if (setup.location) location = setup.location
	if (setup.grinder) {
		grinder = setup.grinder as GrinderId
		grindSetting = setup.grindSetting ?? ''
	}
	if (setup.grindSize && !setup.grinder) grindSize = setup.grindSize
	if (setup.coffeeGrams !== undefined) coffeeGrams = setup.coffeeGrams
	if (setup.waterGrams !== undefined) waterGrams = setup.waterGrams
	if (setup.waterTempF !== undefined) waterTempF = setup.waterTempF
	if (setup.brewTimeSeconds !== undefined) {
		brewTimeSeed = setup.brewTimeSeconds
		brewTimeVersion += 1
	}
	// Most of these fields live in the collapsed Brew section; show what was filled.
	brewOpen = true
}

/** Fills the coffee's own details, overwriting what's there and leaving fields `coffee` lacks. */
function fillCoffee(coffee: CoffeeFields) {
	roaster = coffee.roaster ?? ''
	productName = coffee.productName ?? ''
	if (coffee.country) country = coffee.country
	if (coffee.process) beanProcess = coffee.process
	if (coffee.roastLevel) roastLevel = coffee.roastLevel
	if (coffee.region) region = coffee.region
	if (coffee.roasterNotes) roasterNotes = [...coffee.roasterNotes]
	if (coffee.roastDate) roastDate = coffee.roastDate
	coffeeOpen = true
}

function applyDefaults() {
	fillBrewSetup(defaults)
	defaultsApplied = true
}

/** "Last setup": the coffee, drink and whole setup from the most recent pour. Ratings and notes
 *  belong to the new cup and the brew date is today's, so those are never copied. */
function repeatLastSetup() {
	const last = data.lastPour
	if (!last) return
	const details = last.details
	fillCoffee(details)
	// Set directly rather than through selectDrinkStyle, which would overwrite the saved method.
	if (details.drinkStyle) drinkStyle = details.drinkStyle
	fillBrewSetup(details)
	if (details.location === 'out' && details.locationName) {
		cafeSeed = {
			name: details.locationName,
			address: details.locationAddress,
			lat: details.locationLat,
			lng: details.locationLng
		}
		cafeVersion += 1
	}
	filledFrom = { brewed: last.brewed, roastDate: details.roastDate }
}

// Free-text notes are bound so "Last entry" can fill them.
let noteText = $state({
	fragranceNotes: '',
	aromaNotes: '',
	flavorNotes: '',
	acidityNotes: '',
	bodyNotes: '',
	finishNotes: '',
	freeText: ''
})
let fragranceOpen = $state(false)
let tasteOpen = $state(false)
let thoughtsOpen = $state(false)

/** "Last entry": a full copy of the most recent pour, ratings and notes included, for logging
 *  another cup that went the same way. Only the brew date stays today's. */
function copyLastEntry() {
	const notes = data.lastPour?.notes
	repeatLastSetup()
	if (!notes) return
	if (notes.overallRating !== undefined) overallRating = notes.overallRating
	if (notes.fragranceIntensity !== undefined) fragranceIntensity = notes.fragranceIntensity
	if (notes.aromaIntensity !== undefined) aromaIntensity = notes.aromaIntensity
	if (notes.aromaClarity !== undefined) aromaClarity = notes.aromaClarity
	if (notes.flavorComplexity !== undefined) flavorComplexity = notes.flavorComplexity
	if (notes.flavorSweetness !== undefined) flavorSweetness = notes.flavorSweetness
	if (notes.acidityIntensity !== undefined) acidityIntensity = notes.acidityIntensity
	if (notes.acidityQuality !== undefined) acidityQuality = notes.acidityQuality
	if (notes.bodyWeight !== undefined) bodyWeight = notes.bodyWeight
	if (notes.bodyTactile !== undefined) bodyTactile = notes.bodyTactile
	if (notes.finishFlavor !== undefined) finishFlavor = notes.finishFlavor
	if (notes.finishLength !== undefined) finishLength = notes.finishLength
	if (notes.wouldBuyAgain !== undefined) wouldBuyAgain = notes.wouldBuyAgain ? 'yes' : 'no'
	if (notes.tasterNotes) tasterNotes = [...notes.tasterNotes]
	for (const key of Object.keys(noteText) as (keyof typeof noteText)[]) {
		const text = notes[key]
		if (text) noteText[key] = text
	}
	fragranceOpen = true
	tasteOpen = true
	thoughtsOpen = true
}

/** Fills Brew Method from the drink when the drink implies one (a latte starts as espresso).
 *  Switching away clears a method this filled, but never one the taster picked. */
function selectDrinkStyle(next: string) {
	const method = impliedBrewMethod(next)
	if (method) brewMethod = method
	else if (brewMethod === impliedBrewMethod(drinkStyle)) brewMethod = ''
	drinkStyle = next
}

/** Picking a past coffee fills only the coffee: brew setup and ratings belong to this cup. */
function fillFromPast(coffee: PastCoffee) {
	fillCoffee(coffee)
	filledFrom = { brewed: coffee.lastBrewed, roastDate: coffee.roastDate }
}

// The taster's own vocabulary first, so their spelling of a note wins over the stock list.
const noteSuggestions = $derived([...new Set([...data.pastNotes, ...FLAVOR_NOTES])])
const dayFormatter = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' })

const listFormatter = new Intl.ListFormat('en', { style: 'long', type: 'conjunction' })

const inputClass =
	'border-b border-dark-ink bg-transparent py-2 focus:outline-none placeholder:text-gray-300'
const labelClass = 'text-xs uppercase tracking-widest text-gray-500'
const sectionHeadingClass =
	'text-sm uppercase tracking-widest text-gray-500 font-semibold border-b border-gray-200 pb-2'
const textareaClass =
	'border-b border-dark-ink bg-transparent py-2 resize-none focus:outline-none placeholder:text-gray-300'
const toggleClass =
	'min-h-11 min-w-11 shrink-0 whitespace-nowrap px-3 py-2 border text-sm transition-colors rounded-full border-dark-ink'
// Side-by-side pairs stack on phones, where half the width truncates labels and values.
const pairClass = 'grid grid-cols-1 gap-6 sm:grid-cols-2'

const PROCESS_OPTIONS = PROCESSES.map((process) => ({ value: process, label: process }))
const LOCATION_OPTIONS = [
	{ value: 'home', label: 'Home' },
	{ value: 'out', label: 'Out' }
]
const BUY_AGAIN_OPTIONS = [
	{ value: 'yes', label: 'Yes' },
	{ value: 'no', label: 'No' }
]
</script>

<Flowers />
<section class="flex flex-col items-center min-h-[100dvh] px-4 pt-4 w-full max-w-6xl mx-auto">
	<AppHeader title="Log a Pour" backTo="/dashboard" />

	<form
		method="POST"
		use:enhance={({ cancel }) => {
			const missing: string[] = []
			if (overallRating === 0) missing.push('an overall rating')
			if (!roaster.trim() && !productName.trim()) missing.push('a roaster or coffee name')
			if (!brewMethod) missing.push('a brew method')
			if (missing.length > 0) {
				clientError = `Please add ${listFormatter.format(missing)}.`
				cancel()
				return
			}
			clientError = ''
			submitting = true
			return async ({ update }) => {
				await update()
				submitting = false
			}
		}}
		class="flex flex-col gap-10 flex-1 w-full max-w-lg mt-8"
	>
		<div class="flex flex-col gap-6">
			<h2 class={sectionHeadingClass}>The Essentials</h2>

			{#if data.lastPour || hasDefaults}
				<div class="flex items-center justify-between gap-2">
					<span class={labelClass}>Autofill</span>
					<div class="flex gap-2">
						{#if data.lastPour}
							<button
								type="button"
								onclick={repeatLastSetup}
								title="Coffee, drink and brew setup from your last pour"
								class={toggleClass}
							>
								Last setup
							</button>
							<button
								type="button"
								onclick={copyLastEntry}
								title="Everything from your last pour, ratings and notes included"
								class={toggleClass}
							>
								Last entry
							</button>
						{/if}
						{#if hasDefaults}
							<button
								type="button"
								onclick={applyDefaults}
								title="Your saved brew setup from your profile"
								class={toggleClass}
							>
								My defaults
							</button>
						{/if}
					</div>
				</div>
				{#if defaultsApplied}
					<p class="-mt-3 text-right text-xs text-gray-500">Brew setup filled in below.</p>
				{/if}
			{/if}
			{#if !hasDefaults}
				<p class="text-[10px] text-gray-400 -mt-2">
					Save your usual brew setup on your
					<a href={resolve('/profile')} class="underline">profile</a> to fill it here in one tap.
				</p>
			{/if}

			<div class="flex flex-col gap-1">
				<div class={pairClass}>
					<div class="flex flex-col gap-1">
						<label for="roaster" class={labelClass}>
							Roaster<span class="text-red-500"> *</span>
						</label>
						<PastCoffeeInput
							id="roaster"
							name="roaster"
							bind:value={roaster}
							coffees={data.pastCoffees}
							onpick={fillFromPast}
							placeholder="e.g. Blue Bottle"
							{inputClass}
						/>
					</div>

					<div class="flex flex-col gap-1">
						<label for="productName" class={labelClass}>
							Coffee Name<span class="text-red-500"> *</span>
						</label>
						<PastCoffeeInput
							id="productName"
							name="productName"
							bind:value={productName}
							coffees={data.pastCoffees}
							onpick={fillFromPast}
							placeholder="e.g. Yirgacheffe Konga"
							{inputClass}
						/>
					</div>
				</div>
				<p class="text-[10px] text-gray-400 mt-1">Only one of these is required.</p>
				{#if filledFrom}
					<p class="text-xs text-gray-500 mt-1" role="status">
						Filled from your pour on {dayFormatter.format(new Date(`${filledFrom.brewed}T00:00`))}.
						{#if filledFrom.roastDate}New bag? Update the roast date under Brew.{/if}
					</p>
				{/if}
			</div>

			<div class="flex flex-col gap-1">
				<label for="country" class={labelClass}>Origin</label>
				<select id="country" name="country" bind:value={country} class={inputClass}>
					<option value="">Select a country</option>
					{#each COUNTRIES as option (option)}
						<option value={option}>{option}</option>
					{/each}
				</select>
			</div>

			<ChoicePills
				label="Process"
				name="process"
				options={PROCESS_OPTIONS}
				bind:value={beanProcess}
				clearable
			/>

			<div class={pairClass}>
				<div class="flex flex-col gap-1">
					<label for="drinkStyle" class={labelClass}>Style</label>
					<select
						id="drinkStyle"
						name="drinkStyle"
						bind:value={() => drinkStyle, selectDrinkStyle}
						class={inputClass}
					>
						<option value="">Select a style</option>
						<optgroup label="Brewed">
							{#each BREWED_DRINKS as style (style)}
								<option value={style}>{style}</option>
							{/each}
						</optgroup>
						<optgroup label="Espresso">
							{#each ESPRESSO_DRINKS as style (style)}
								<option value={style}>{style}</option>
							{/each}
						</optgroup>
						<option value="Other">Other</option>
					</select>
				</div>

				<div class="flex flex-col gap-1">
					<label for="brewMethod" class={labelClass}>
						Brew Method<span class="text-red-500"> *</span>
					</label>
					<select id="brewMethod" name="brewMethod" bind:value={brewMethod} class={inputClass}>
						<option value="" disabled>Select a method</option>
						{#each BREW_METHODS as method (method)}
							<option value={method}>{method}</option>
						{/each}
					</select>
				</div>
			</div>

			<div class="flex flex-col gap-3">
				<ChoicePills
					label="Where"
					name="location"
					options={LOCATION_OPTIONS}
					bind:value={location}
					inline
				/>
				{#if location === 'out'}
					{#key cafeVersion}
						<CafeLocationInput initial={cafeSeed} recent={data.pastVenues} />
					{/key}
				{/if}
			</div>

			<div class="flex flex-col gap-3">
				<RatingRow
					name="overallRating"
					label="Overall Rating"
					bind:value={overallRating}
					max={10}
					required
				/>
				<div class="flex justify-between text-[10px] text-gray-400 uppercase tracking-widest">
					<span>Poor</span>
					<span>Excellent</span>
				</div>
			</div>

			<div class="flex flex-col gap-3">
				<RatingRow name="roastLevel" label="Roast Level" bind:value={roastLevel} max={10} />
				<div class="flex justify-between text-[10px] text-gray-400 uppercase tracking-widest">
					<span>Light</span>
					<span>Dark</span>
				</div>
			</div>

			<ChoicePills
				label="Would You Buy It Again?"
				name="wouldBuyAgain"
				options={BUY_AGAIN_OPTIONS}
				bind:value={wouldBuyAgain}
				clearable
			/>
		</div>

		<div class="flex flex-col border-b border-gray-200">
			<FormSection title="Coffee Details" bind:open={coffeeOpen}>
				<div class="flex flex-col gap-1">
					<label for="region" class={labelClass}>Region</label>
					<input
						id="region"
						name="region"
						type="text"
						placeholder="e.g. Yirgacheffe"
						bind:value={region}
						class={inputClass}
					/>
				</div>

				<div class="flex flex-col gap-1">
					<label for="roasterNotes" class={labelClass}>Roaster's Notes</label>
					<TagInput
						id="roasterNotes"
						name="roasterNotes"
						bind:tags={roasterNotes}
						suggestions={noteSuggestions}
						placeholder="e.g. raspberry, magnolia, vanilla"
						{inputClass}
					/>
				</div>
			</FormSection>

			<FormSection title="Brew" bind:open={brewOpen}>
				<GrindInput
					bind:grinder
					bind:grindSize
					bind:grindSetting
					sizePlaceholder="Select a size"
					{inputClass}
					{labelClass}
				/>

				<!-- items-end: a label that wraps on a phone pushes up, not its input down. -->
				<div class="grid grid-cols-3 items-end gap-6">
					<div class="flex flex-col gap-1">
						<label for="coffeeGrams" class={labelClass}>Coffee (g)</label>
						<input
							id="coffeeGrams"
							name="coffeeGrams"
							type="number"
							min="0"
							bind:value={coffeeGrams}
							class={inputClass}
						/>
					</div>

					<div class="flex flex-col gap-1">
						<label for="waterGrams" class={labelClass}>Water (g)</label>
						<input
							id="waterGrams"
							name="waterGrams"
							type="number"
							min="0"
							bind:value={waterGrams}
							class={inputClass}
						/>
					</div>

					<div class="flex flex-col gap-1">
						<label for="waterTempF" class={labelClass}>Water Temp (°F)</label>
						<input
							id="waterTempF"
							name="waterTempF"
							type="number"
							min="0"
							bind:value={waterTempF}
							class={inputClass}
						/>
					</div>
				</div>

				<div class="flex flex-col gap-1">
					<span class={labelClass}>Brew Time</span>
					{#key brewTimeVersion}
						<BrewTimeInput name="brewTimeSeconds" initialSeconds={brewTimeSeed} {inputClass} />
					{/key}
				</div>

				<div class="grid grid-cols-2 gap-6">
					<div class="flex flex-col gap-1">
						<label for="roastDate" class={labelClass}>Roast Date</label>
						<input
							id="roastDate"
							name="roastDate"
							type="date"
							bind:value={roastDate}
							class={inputClass}
						/>
					</div>

					<div class="flex flex-col gap-1">
						<label for="brewDate" class={labelClass}>Brew Date</label>
						<input
							id="brewDate"
							name="brewDate"
							type="date"
							bind:value={brewDate}
							class={inputClass}
						/>
					</div>
				</div>
			</FormSection>

			<FormSection title="Fragrance & Aroma" bind:open={fragranceOpen}>
				<p class="text-xs text-gray-500">
					Smell it twice: once dry, once brewed. Fragrance often reads sweeter and roastier;
					aroma is where fruit and florals open up. Note what changes between the two.
				</p>

				<div class="flex flex-col gap-4">
					<div class="flex flex-col gap-1">
						<span class="text-sm font-semibold">Fragrance</span>
						<span class="text-[10px] text-gray-400">
							Dry — the ground coffee, before any water touches it.
						</span>
					</div>
					<div class={pairClass}>
						<RatingRow
							name="fragranceIntensity"
							label="Intensity"
							bind:value={fragranceIntensity}
						/>
					</div>
					<textarea
						bind:value={noteText.fragranceNotes}
						name="fragranceNotes"
						rows="2"
						placeholder="e.g. brown sugar, cocoa, toasted nuts"
						class={textareaClass}
					></textarea>
				</div>

				<div class="flex flex-col gap-4">
					<div class="flex flex-col gap-1">
						<span class="text-sm font-semibold">Aroma</span>
						<span class="text-[10px] text-gray-400">
							Wet — the brewed cup, or the grounds as they bloom.
						</span>
					</div>
					<div class={pairClass}>
						<RatingRow name="aromaIntensity" label="Intensity" bind:value={aromaIntensity} />
						<RatingRow name="aromaClarity" label="Clarity" bind:value={aromaClarity} />
					</div>
					<textarea
						bind:value={noteText.aromaNotes}
						name="aromaNotes"
						rows="2"
						placeholder="What changed once water hit? e.g. jasmine opened up, cocoa faded"
						class={textareaClass}
					></textarea>
				</div>
			</FormSection>

			<FormSection title="Taste" bind:open={tasteOpen}>
				<div class="flex flex-col gap-4">
					<span class="text-sm font-semibold">Flavor</span>
					<div class={pairClass}>
						<RatingRow name="flavorComplexity" label="Complexity" bind:value={flavorComplexity} />
						<RatingRow name="flavorSweetness" label="Sweetness" bind:value={flavorSweetness} />
					</div>
					<textarea
						bind:value={noteText.flavorNotes}
						name="flavorNotes"
						rows="2"
						placeholder="Notes on flavor..."
						class={textareaClass}
					></textarea>
				</div>

				<div class="flex flex-col gap-4">
					<span class="text-sm font-semibold">Acidity</span>
					<div class={pairClass}>
						<RatingRow name="acidityIntensity" label="Intensity" bind:value={acidityIntensity} />
						<RatingRow name="acidityQuality" label="Quality" bind:value={acidityQuality} />
					</div>
					<textarea
						bind:value={noteText.acidityNotes}
						name="acidityNotes"
						rows="2"
						placeholder="Notes on acidity..."
						class={textareaClass}
					></textarea>
				</div>

				<div class="flex flex-col gap-4">
					<span class="text-sm font-semibold">Body</span>
					<div class={pairClass}>
						<RatingRow name="bodyWeight" label="Weight" bind:value={bodyWeight} />
						<RatingRow name="bodyTactile" label="Tactile" bind:value={bodyTactile} />
					</div>
					<textarea
						bind:value={noteText.bodyNotes}
						name="bodyNotes"
						rows="2"
						placeholder="Notes on body..."
						class={textareaClass}
					></textarea>
				</div>

				<div class="flex flex-col gap-4">
					<span class="text-sm font-semibold">Finish</span>
					<div class={pairClass}>
						<RatingRow name="finishFlavor" label="Flavor" bind:value={finishFlavor} />
						<RatingRow name="finishLength" label="Length" bind:value={finishLength} />
					</div>
					<textarea
						bind:value={noteText.finishNotes}
						name="finishNotes"
						rows="2"
						placeholder="Notes on finish..."
						class={textareaClass}
					></textarea>
				</div>

				<div class="flex flex-col gap-1">
					<label for="tasterNotes" class={labelClass}>What You Tasted</label>
					<TagInput
						id="tasterNotes"
						name="tasterNotes"
						bind:tags={tasterNotes}
						suggestions={noteSuggestions}
						quickPicks={roasterNotes}
						quickPickLabel="Tasted the roaster's notes? Tap to add"
						placeholder="e.g. blueberry, cocoa, lemon"
						{inputClass}
					/>
					<p class="text-[10px] text-gray-400">
						Your own notes — compared against the roaster's on your dashboard.
					</p>
				</div>
			</FormSection>

			<FormSection title="Final Thoughts" bind:open={thoughtsOpen}>
				<label for="freeText" class="sr-only">Final Thoughts</label>
				<textarea
					id="freeText"
					bind:value={noteText.freeText}
					name="freeText"
					rows="4"
					placeholder="What stood out? Any flavor notes..."
					class={textareaClass}
				></textarea>
			</FormSection>
		</div>

		<div class="sticky bottom-0 z-10 -mx-4 flex flex-col gap-2 border-t border-gray-200 bg-off-white px-4 py-3 sm:mx-0 sm:px-0">
			{#if clientError || form?.error}
				<p class="text-sm text-red-500">{clientError || form?.error}</p>
			{/if}
			<button
				type="submit"
				disabled={submitting}
				class="w-full py-3 bg-dark-ink text-off-white text-lg disabled:opacity-50 hover:bg-charcoal transition-colors"
			>
				{submitting ? 'Saving...' : 'Save'}
			</button>
		</div>
	</form>
</section>
