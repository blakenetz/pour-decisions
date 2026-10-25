<script lang="ts">
/** The beer's collapsible sections, in the order a beer is judged: look, smell, taste, feel. */
import { RatingRow } from '$lib'
import ChoicePills from '$lib/components/ChoicePills.svelte'
import FormSection from '$lib/components/FormSection.svelte'
import TagInput from '$lib/components/TagInput.svelte'
import { BEER_CLARITY, BEER_COLORS } from '$lib/types/beer'
import type { BeerDraft } from './beer-draft.svelte'

let {
	draft,
	tasterNotes = $bindable([]),
	hopSuggestions,
	ingredientSuggestions,
	noteSuggestions,
	inputClass,
	labelClass,
	textareaClass,
	pairClass
}: {
	draft: BeerDraft
	tasterNotes?: string[]
	hopSuggestions: readonly string[]
	ingredientSuggestions: readonly string[]
	noteSuggestions: readonly string[]
	inputClass: string
	labelClass: string
	textareaClass: string
	pairClass: string
} = $props()

const COLOR_OPTIONS = BEER_COLORS.map((color) => ({ value: color, label: color }))
const CLARITY_OPTIONS = BEER_CLARITY.map((clarity) => ({ value: clarity, label: clarity }))
</script>

<FormSection title="Beer Details" bind:open={draft.open.details}>
	<div class="flex flex-col gap-1">
		<label for="hops" class={labelClass}>Hops</label>
		<TagInput
			id="hops"
			name="hops"
			bind:tags={draft.hops}
			suggestions={hopSuggestions}
			placeholder="e.g. citra, mosaic"
			{inputClass}
		/>
	</div>

	<div class="flex flex-col gap-1">
		<label for="ingredients" class={labelClass}>Other Ingredients</label>
		<TagInput
			id="ingredients"
			name="ingredients"
			bind:tags={draft.ingredients}
			suggestions={ingredientSuggestions}
			placeholder="e.g. oats, lactose, mango"
			{inputClass}
		/>
	</div>

	<div class="flex flex-col gap-1">
		<label for="breweryNotes" class={labelClass}>Brewery's Notes</label>
		<TagInput
			id="breweryNotes"
			name="breweryNotes"
			bind:tags={draft.breweryNotes}
			suggestions={noteSuggestions}
			placeholder="e.g. grapefruit, pine, resin"
			{inputClass}
		/>
	</div>

	<div class="grid grid-cols-2 gap-6">
		<div class="flex flex-col gap-1">
			<label for="packagedDate" class={labelClass}>Packaged On</label>
			<input
				id="packagedDate"
				name="packagedDate"
				type="date"
				bind:value={draft.packagedDate}
				class={inputClass}
			/>
		</div>

		<div class="flex flex-col gap-1">
			<label for="tastedOn" class={labelClass}>Tasted On</label>
			<input
				id="tastedOn"
				name="tastedOn"
				type="date"
				bind:value={draft.tastedOn}
				class={inputClass}
			/>
		</div>
	</div>
</FormSection>

<FormSection title="Appearance" bind:open={draft.open.appearance}>
	<ChoicePills
		label="Color"
		name="color"
		options={COLOR_OPTIONS}
		bind:value={draft.color}
		clearable
	/>
	<ChoicePills
		label="Clarity"
		name="clarity"
		options={CLARITY_OPTIONS}
		bind:value={draft.clarity}
		clearable
	/>
	<div class={pairClass}>
		<RatingRow name="headRetention" label="Head Retention" bind:value={draft.headRetention} />
		<RatingRow name="appearanceRating" label="Appearance" bind:value={draft.appearanceRating} />
	</div>
	<textarea
		bind:value={draft.text.appearanceNotes}
		name="appearanceNotes"
		rows="2"
		placeholder="e.g. thick white head, lacing down the glass"
		class={textareaClass}
	></textarea>
</FormSection>

<FormSection title="Aroma" bind:open={draft.open.aroma}>
	<div class={pairClass}>
		<RatingRow name="aromaIntensity" label="Intensity" bind:value={draft.aromaIntensity} />
		<RatingRow name="aromaQuality" label="Quality" bind:value={draft.aromaQuality} />
	</div>
	<textarea
		bind:value={draft.text.aromaNotes}
		name="aromaNotes"
		rows="2"
		placeholder="e.g. mango, pine, a little dank"
		class={textareaClass}
	></textarea>
</FormSection>

<FormSection title="Flavor" bind:open={draft.open.flavor}>
	<div class={pairClass}>
		<RatingRow name="maltiness" label="Maltiness" bind:value={draft.maltiness} />
		<RatingRow name="hopIntensity" label="Hop Intensity" bind:value={draft.hopIntensity} />
	</div>
	<div class={pairClass}>
		<RatingRow name="bitterness" label="Bitterness" bind:value={draft.bitterness} />
		<RatingRow name="sweetness" label="Sweetness" bind:value={draft.sweetness} />
	</div>
	<div class={pairClass}>
		<RatingRow name="flavorBalance" label="Balance" bind:value={draft.flavorBalance} />
	</div>
	<textarea
		bind:value={draft.text.flavorNotes}
		name="flavorNotes"
		rows="2"
		placeholder="Notes on flavor..."
		class={textareaClass}
	></textarea>

	<div class="flex flex-col gap-1">
		<label for="tasterNotes" class={labelClass}>What You Tasted</label>
		<TagInput
			id="tasterNotes"
			name="tasterNotes"
			bind:tags={tasterNotes}
			suggestions={noteSuggestions}
			quickPicks={draft.breweryNotes}
			quickPickLabel="Tasted the brewery's notes? Tap to add"
			placeholder="e.g. grapefruit, biscuit, pine"
			{inputClass}
		/>
		<p class="text-[10px] text-gray-400">
			Your own notes — compared against the brewery's on your dashboard.
		</p>
	</div>
</FormSection>

<FormSection title="Mouthfeel & Finish" bind:open={draft.open.mouthfeel}>
	<div class={pairClass}>
		<RatingRow name="bodyWeight" label="Body" bind:value={draft.bodyWeight} />
		<RatingRow name="carbonation" label="Carbonation" bind:value={draft.carbonation} />
	</div>
	<textarea
		bind:value={draft.text.mouthfeelNotes}
		name="mouthfeelNotes"
		rows="2"
		placeholder="Notes on mouthfeel..."
		class={textareaClass}
	></textarea>
	<div class={pairClass}>
		<RatingRow name="finishLength" label="Finish Length" bind:value={draft.finishLength} />
		<RatingRow name="finishQuality" label="Finish" bind:value={draft.finishQuality} />
	</div>
	<textarea
		bind:value={draft.text.finishNotes}
		name="finishNotes"
		rows="2"
		placeholder="Notes on finish..."
		class={textareaClass}
	></textarea>
</FormSection>
