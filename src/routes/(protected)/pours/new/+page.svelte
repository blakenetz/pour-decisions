<script lang="ts">
import { enhance } from '$app/forms'
import { Flowers, RatingRow } from '$lib'
import type { ActionData } from './$types'

const BREW_METHODS = ['Espresso', 'Pour Over', 'French Press', 'Drip', 'Cold Brew', 'AeroPress']
const GRIND_SIZES = [
	'Extra Fine',
	'Fine',
	'Medium-Fine',
	'Medium',
	'Medium-Coarse',
	'Coarse',
	'Extra Coarse'
]

let { form }: { form: ActionData } = $props()

let roastLevel = $state(0)
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
let submitting = $state(false)

const inputClass =
	'border-b border-dark-ink bg-transparent py-2 focus:outline-none placeholder:text-gray-300'
const labelClass = 'text-xs uppercase tracking-widest text-gray-500'
const sectionHeadingClass =
	'text-sm uppercase tracking-widest text-gray-500 font-semibold border-b border-gray-200 pb-2'
const textareaClass =
	'border-b border-dark-ink bg-transparent py-2 resize-none focus:outline-none placeholder:text-gray-300'
</script>

<Flowers />
<section class="min-h-[100dvh] p-6 flex flex-col max-w-lg mx-auto">
	<header class="mb-10">
		<a href="/" class="text-sm text-gray-500 hover:text-dark-ink">← Back</a>
		<h1 class="text-5xl mt-3">Log a Pour</h1>
	</header>

	<form
		method="POST"
		use:enhance={() => {
			submitting = true
			return async ({ update }) => {
				await update()
				submitting = false
			}
		}}
		class="flex flex-col gap-10 flex-1"
	>
		<div class="flex flex-col gap-6">
			<h2 class={sectionHeadingClass}>Details</h2>

			<div class="grid grid-cols-2 gap-6">
				<div class="flex flex-col gap-1">
					<label for="producer" class={labelClass}>Roaster</label>
					<input
						id="producer"
						name="producer"
						type="text"
						placeholder="e.g. Blue Bottle"
						class={inputClass}
					/>
				</div>

				<div class="flex flex-col gap-1">
					<label for="productName" class={labelClass}>Coffee Name</label>
					<input
						id="productName"
						name="productName"
						type="text"
						placeholder="e.g. Ethiopia Yirgacheffe"
						class={inputClass}
					/>
				</div>
			</div>

			<div class="flex flex-col gap-1">
				<label for="region" class={labelClass}>Region</label>
				<input
					id="region"
					name="region"
					type="text"
					placeholder="e.g. Yirgacheffe, Ethiopia"
					class={inputClass}
				/>
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

			<div class="flex flex-col gap-3">
				<RatingRow name="roastLevel" label="Roast Level" bind:value={roastLevel} max={10} />
				<div class="flex justify-between text-[10px] text-gray-400 uppercase tracking-widest">
					<span>Light</span>
					<span>Dark</span>
				</div>
			</div>
		</div>

		<div class="flex flex-col gap-6">
			<h2 class={sectionHeadingClass}>Brew</h2>

			<div class="grid grid-cols-2 gap-6">
				<div class="flex flex-col gap-1">
					<label for="brewMethod" class={labelClass}>Brew Method</label>
					<select id="brewMethod" name="brewMethod" class={inputClass}>
						<option value="" disabled selected>Select a method</option>
						{#each BREW_METHODS as method (method)}
							<option value={method}>{method}</option>
						{/each}
					</select>
				</div>

				<div class="flex flex-col gap-1">
					<label for="grindSize" class={labelClass}>Grind Size</label>
					<select id="grindSize" name="grindSize" class={inputClass}>
						<option value="" disabled selected>Select a size</option>
						{#each GRIND_SIZES as size (size)}
							<option value={size}>{size}</option>
						{/each}
					</select>
				</div>
			</div>

			<div class="grid grid-cols-3 gap-6">
				<div class="flex flex-col gap-1">
					<label for="coffeeGrams" class={labelClass}>Coffee (g)</label>
					<input id="coffeeGrams" name="coffeeGrams" type="number" min="0" class={inputClass} />
				</div>

				<div class="flex flex-col gap-1">
					<label for="waterGrams" class={labelClass}>Water (g)</label>
					<input id="waterGrams" name="waterGrams" type="number" min="0" class={inputClass} />
				</div>

				<div class="flex flex-col gap-1">
					<label for="waterTempF" class={labelClass}>Water Temp (°F)</label>
					<input id="waterTempF" name="waterTempF" type="number" min="0" class={inputClass} />
				</div>
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
			<h2 class={sectionHeadingClass}>Ratings</h2>

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

		{#if form?.error}
			<p class="text-red-500 text-sm">{form.error}</p>
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
