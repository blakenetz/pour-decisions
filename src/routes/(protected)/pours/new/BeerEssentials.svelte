<script lang="ts">
/** The beer's up-front fields: what it is, how strong, how it was served. */
import type { Snippet } from 'svelte'
import ChoicePills from '$lib/components/ChoicePills.svelte'
import PastProductInput from '$lib/components/PastProductInput.svelte'
import StyleInput from '$lib/components/StyleInput.svelte'
import type { PastProduct } from '$lib/past-pours'
import { SERVINGS } from '$lib/types/beer'
import type { BeerDraft } from './beer-draft.svelte'

let {
	draft,
	products,
	customStyles,
	onpick,
	status,
	inputClass,
	labelClass,
	pairClass
}: {
	draft: BeerDraft
	products: readonly PastProduct[]
	customStyles: readonly { style: string; family: string }[]
	onpick: (product: PastProduct) => void
	/** Shown under the names, e.g. which pour the form was filled from. */
	status?: Snippet
	inputClass: string
	labelClass: string
	pairClass: string
} = $props()

const SERVING_OPTIONS = SERVINGS.map((serving) => ({ value: serving, label: serving }))
</script>

<div class="flex flex-col gap-1">
	<div class={pairClass}>
		<div class="flex flex-col gap-1">
			<label for="brewery" class={labelClass}>
				Brewery<span class="text-red-500"> *</span>
			</label>
			<PastProductInput
				id="brewery"
				name="brewery"
				bind:value={draft.brewery}
				{products}
				{onpick}
				placeholder="e.g. Russian River"
				{inputClass}
			/>
		</div>

		<div class="flex flex-col gap-1">
			<label for="productName" class={labelClass}>
				Beer Name<span class="text-red-500"> *</span>
			</label>
			<PastProductInput
				id="productName"
				name="productName"
				bind:value={draft.productName}
				{products}
				{onpick}
				placeholder="e.g. Pliny the Elder"
				{inputClass}
			/>
		</div>
	</div>
	<p class="text-[10px] text-gray-400 mt-1">Only one of these is required.</p>
	{@render status?.()}
</div>

<StyleInput
	bind:style={draft.style}
	bind:family={draft.styleFamily}
	{customStyles}
	{inputClass}
	{labelClass}
/>

<!-- items-end: a label that wraps on a phone pushes up, not its input down. -->
<div class="grid grid-cols-2 items-end gap-6">
	<div class="flex flex-col gap-1">
		<label for="abv" class={labelClass}>ABV (%)</label>
		<input
			id="abv"
			name="abv"
			type="number"
			step="0.1"
			min="0"
			max="70"
			bind:value={draft.abv}
			class={inputClass}
		/>
	</div>

	<div class="flex flex-col gap-1">
		<label for="ibu" class={labelClass}>IBU</label>
		<input
			id="ibu"
			name="ibu"
			type="number"
			min="0"
			max="200"
			bind:value={draft.ibu}
			class={inputClass}
		/>
	</div>
</div>

<ChoicePills
	label="Serving"
	name="serving"
	options={SERVING_OPTIONS}
	bind:value={draft.serving}
	clearable
/>
