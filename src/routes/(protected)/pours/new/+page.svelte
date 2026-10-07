<script lang="ts">
import { enhance } from '$app/forms'
import { resolve } from '$app/paths'
import { Flowers, RatingRow } from '$lib'
import AppHeader from '$lib/components/AppHeader.svelte'
import BrewTimeInput from '$lib/components/BrewTimeInput.svelte'
import CafeLocationInput from '$lib/components/CafeLocationInput.svelte'
import { BREW_METHODS, COUNTRIES, GRIND_SIZES, PROCESSES } from '$lib/types/coffee'
import type { ActionData, PageData } from './$types'

let { data, form }: { data: PageData; form: ActionData } = $props()

// The taster's saved brew setup (Profile). Never applied on load: only "Use my brew defaults"
// fills it in, so every value on a pour is one the taster chose to put there.
const defaults = $derived(data.defaults)
const hasDefaults = $derived(Object.values(defaults).some((value) => value !== undefined))
let defaultsApplied = $state(false)

// Required up-front fields are bound so we can validate before submitting.
let productName = $state('')
let roaster = $state('')
let brewMethod = $state('')
let overallRating = $state(0)

let roastLevel = $state(0)
let location: 'home' | 'out' = $state('home')
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
let wouldBuyAgain: 'yes' | 'no' | '' = $state('')
let submitting = $state(false)
let clientError = $state('')

// Brew setup fields are bound so "Use my brew defaults" can fill them.
let grindSize = $state('')
let coffeeGrams: number | null = $state(null)
let waterGrams: number | null = $state(null)
let waterTempF: number | null = $state(null)
let brewTimeSeed: number | undefined = $state(undefined)
// BrewTimeInput keeps its own min/sec state; bumping this remounts it with the new seed.
let brewTimeVersion = $state(0)
let detailsOpen = $state(false)

/** Fills every field that has a saved default (overwriting what's there) and leaves the rest. */
function applyDefaults() {
	if (defaults.brewMethod) brewMethod = defaults.brewMethod
	if (defaults.location) location = defaults.location
	if (defaults.grindSize) grindSize = defaults.grindSize
	if (defaults.coffeeGrams !== undefined) coffeeGrams = defaults.coffeeGrams
	if (defaults.waterGrams !== undefined) waterGrams = defaults.waterGrams
	if (defaults.waterTempF !== undefined) waterTempF = defaults.waterTempF
	if (defaults.brewTimeSeconds !== undefined) {
		brewTimeSeed = defaults.brewTimeSeconds
		brewTimeVersion += 1
	}
	// Most of these fields live in the collapsed details; show what was filled.
	detailsOpen = true
	defaultsApplied = true
}

const listFormatter = new Intl.ListFormat('en', { style: 'long', type: 'conjunction' })

const inputClass =
	'border-b border-dark-ink bg-transparent py-2 focus:outline-none placeholder:text-gray-300'
const labelClass = 'text-xs uppercase tracking-widest text-gray-500'
const sectionHeadingClass =
	'text-sm uppercase tracking-widest text-gray-500 font-semibold border-b border-gray-200 pb-2'
const textareaClass =
	'border-b border-dark-ink bg-transparent py-2 resize-none focus:outline-none placeholder:text-gray-300'
const toggleClass = 'px-4 py-2 border text-sm transition-colors rounded-full border-dark-ink'
</script>

<Flowers />
<section class="flex flex-col items-center min-h-[100dvh] p-4 w-full max-w-6xl mx-auto">
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

			{#if hasDefaults}
				<div class="flex items-center gap-3">
					<button type="button" onclick={applyDefaults} class={toggleClass}>
						Use my brew defaults
					</button>
					{#if defaultsApplied}
						<span class="text-xs text-gray-500">Brew setup filled in below.</span>
					{/if}
				</div>
			{:else}
				<p class="text-[10px] text-gray-400 -mt-2">
					Save your usual brew setup on your
					<a href={resolve('/profile')} class="underline">profile</a> to fill it here in one tap.
				</p>
			{/if}

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

			<div class="flex flex-col gap-1">
				<div class="grid grid-cols-2 gap-6">
					<div class="flex flex-col gap-1">
						<label for="productName" class={labelClass}>Coffee Name</label>
						<input
							id="productName"
							name="productName"
							type="text"
							bind:value={productName}
							placeholder="e.g. Yirgacheffe Konga"
							class={inputClass}
						/>
					</div>

					<div class="flex flex-col gap-1">
						<label for="roaster" class={labelClass}>Roaster</label>
						<input
							id="roaster"
							name="roaster"
							type="text"
							bind:value={roaster}
							placeholder="e.g. Blue Bottle"
							class={inputClass}
						/>
					</div>
				</div>
				<p class="text-[10px] text-gray-400 mt-1">
					<span class="text-red-500">*</span> Add a roaster or coffee name so you can tell your pours apart.
				</p>
			</div>

			<div class="grid grid-cols-2 gap-6">
				<div class="flex flex-col gap-1">
					<label for="country" class={labelClass}>Origin</label>
					<select id="country" name="country" class={inputClass}>
						<option value="">Select a country</option>
						{#each COUNTRIES as country (country)}
							<option value={country}>{country}</option>
						{/each}
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
				<RatingRow name="roastLevel" label="Roast Level" bind:value={roastLevel} max={10} />
				<div class="flex justify-between text-[10px] text-gray-400 uppercase tracking-widest">
					<span>Light</span>
					<span>Dark</span>
				</div>
			</div>

			<div class="flex flex-col gap-3">
				<span class={labelClass}>Would You Buy It Again?</span>
				<input type="hidden" name="wouldBuyAgain" value={wouldBuyAgain} />
				<div class="flex gap-3">
					<button
						type="button"
						aria-pressed={wouldBuyAgain === 'yes'}
						onclick={() => (wouldBuyAgain = wouldBuyAgain === 'yes' ? '' : 'yes')}
						class="{toggleClass} {wouldBuyAgain === 'yes'
							? 'bg-dark-ink text-off-white'
							: 'bg-transparent text-dark-ink'}"
					>
						Yes
					</button>
					<button
						type="button"
						aria-pressed={wouldBuyAgain === 'no'}
						onclick={() => (wouldBuyAgain = wouldBuyAgain === 'no' ? '' : 'no')}
						class="{toggleClass} {wouldBuyAgain === 'no'
							? 'bg-dark-ink text-off-white'
							: 'bg-transparent text-dark-ink'}"
					>
						No
					</button>
				</div>
			</div>
		</div>

		<details class="group border-t border-gray-200 pt-6" bind:open={detailsOpen}>
			<summary
				class="flex cursor-pointer select-none items-center gap-2 text-sm font-semibold uppercase tracking-widest text-gray-500 list-none [&::-webkit-details-marker]:hidden"
			>
				<span class="text-lg leading-none transition-transform group-open:rotate-45">+</span>
				<span class="group-open:hidden">Add tasting details</span>
				<span class="hidden group-open:inline">Tasting details</span>
			</summary>

			<div class="mt-8 flex flex-col gap-10">
				<div class="flex flex-col gap-6">
					<h3 class={sectionHeadingClass}>Coffee Details</h3>

					<div class="grid grid-cols-2 gap-6">
						<div class="flex flex-col gap-1">
							<label for="region" class={labelClass}>Region</label>
							<input
								id="region"
								name="region"
								type="text"
								placeholder="e.g. Yirgacheffe"
								class={inputClass}
							/>
						</div>

						<div class="flex flex-col gap-1">
							<label for="process" class={labelClass}>Process</label>
							<select id="process" name="process" class={inputClass}>
								<option value="">Select a process</option>
								{#each PROCESSES as process (process)}
									<option value={process}>{process}</option>
								{/each}
							</select>
						</div>
					</div>

					<div class="flex flex-col gap-1">
						<label for="roasterNotes" class={labelClass}>Roaster's Notes</label>
						<input
							id="roasterNotes"
							name="roasterNotes"
							type="text"
							placeholder="e.g. raspberry, magnolia, watermelon, vanilla"
							class={inputClass}
						/>
					</div>
				</div>

				<div class="flex flex-col gap-6">
					<h3 class={sectionHeadingClass}>Location</h3>

					<div class="flex flex-col gap-1">
						<label for="location" class={labelClass}>Where</label>
						<select id="location" name="location" class={inputClass} bind:value={location}>
							<option value="home">Home</option>
							<option value="out">Out and about</option>
						</select>
					</div>

					{#if location === 'out'}
						<div class="flex flex-col gap-1">
							<CafeLocationInput />
						</div>
					{/if}
				</div>

				<div class="flex flex-col gap-6">
					<h3 class={sectionHeadingClass}>Brew</h3>

					<div class="flex flex-col gap-1">
						<label for="grindSize" class={labelClass}>Grind Size</label>
						<select
							id="grindSize"
							name="grindSize"
							class={inputClass}
							bind:value={grindSize}
						>
							<option value="" disabled>Select a size</option>
							{#each GRIND_SIZES as size (size)}
								<option value={size}>{size}</option>
							{/each}
						</select>
					</div>

					<div class="grid grid-cols-3 gap-6">
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
							<input id="roastDate" name="roastDate" type="date" class={inputClass} />
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
				</div>

				<div class="flex flex-col gap-6">
					<h3 class={sectionHeadingClass}>Detailed Ratings</h3>

					<div class="flex flex-col gap-4">
						<span class="text-sm font-semibold">Aroma</span>
						<div class="grid grid-cols-2 gap-6">
							<RatingRow name="aromaIntensity" label="Intensity" bind:value={aromaIntensity} />
							<RatingRow name="aromaClarity" label="Clarity" bind:value={aromaClarity} />
						</div>
						<textarea
							name="aromaNotes"
							rows="2"
							placeholder="Notes on aroma..."
							class={textareaClass}
						></textarea>
					</div>

					<div class="flex flex-col gap-4">
						<span class="text-sm font-semibold">Flavor</span>
						<div class="grid grid-cols-2 gap-6">
							<RatingRow name="flavorComplexity" label="Complexity" bind:value={flavorComplexity} />
							<RatingRow name="flavorSweetness" label="Sweetness" bind:value={flavorSweetness} />
						</div>
						<textarea
							name="flavorNotes"
							rows="2"
							placeholder="Notes on flavor..."
							class={textareaClass}
						></textarea>
					</div>

					<div class="flex flex-col gap-4">
						<span class="text-sm font-semibold">Acidity</span>
						<div class="grid grid-cols-2 gap-6">
							<RatingRow name="acidityIntensity" label="Intensity" bind:value={acidityIntensity} />
							<RatingRow name="acidityQuality" label="Quality" bind:value={acidityQuality} />
						</div>
						<textarea
							name="acidityNotes"
							rows="2"
							placeholder="Notes on acidity..."
							class={textareaClass}
						></textarea>
					</div>

					<div class="flex flex-col gap-4">
						<span class="text-sm font-semibold">Body</span>
						<div class="grid grid-cols-2 gap-6">
							<RatingRow name="bodyWeight" label="Weight" bind:value={bodyWeight} />
							<RatingRow name="bodyTactile" label="Tactile" bind:value={bodyTactile} />
						</div>
						<textarea name="bodyNotes" rows="2" placeholder="Notes on body..." class={textareaClass}
						></textarea>
					</div>

					<div class="flex flex-col gap-4">
						<span class="text-sm font-semibold">Finish</span>
						<div class="grid grid-cols-2 gap-6">
							<RatingRow name="finishFlavor" label="Flavor" bind:value={finishFlavor} />
							<RatingRow name="finishLength" label="Length" bind:value={finishLength} />
						</div>
						<textarea
							name="finishNotes"
							rows="2"
							placeholder="Notes on finish..."
							class={textareaClass}
						></textarea>
					</div>

					<div class="flex flex-col gap-1">
						<label for="tasterNotes" class={labelClass}>What You Tasted</label>
						<input
							id="tasterNotes"
							name="tasterNotes"
							type="text"
							placeholder="e.g. blueberry, cocoa, lemon"
							class={inputClass}
						/>
						<p class="text-[10px] text-gray-400 mt-1">
							Your own notes, comma separated — compared against the roaster's on your dashboard.
						</p>
					</div>
				</div>

				<div class="flex flex-col gap-1">
					<label for="freeText" class={labelClass}>Final Thoughts</label>
					<textarea
						id="freeText"
						name="freeText"
						rows="4"
						placeholder="What stood out? Any flavor notes..."
						class={textareaClass}
					></textarea>
				</div>
			</div>
		</details>

		{#if clientError || form?.error}
			<p class="text-red-500 text-sm">{clientError || form?.error}</p>
		{/if}

		<div class="flex justify-end pb-8">
			<button
				type="submit"
				disabled={submitting}
				class="px-8 py-3 bg-dark-ink text-off-white text-lg disabled:opacity-50 hover:bg-charcoal transition-colors"
			>
				{submitting ? 'Saving...' : 'Save'}
			</button>
		</div>
	</form>
</section>
