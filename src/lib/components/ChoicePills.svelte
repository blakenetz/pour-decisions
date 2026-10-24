<script lang="ts">
import ClearButton from './ClearButton.svelte'

/** A short single-choice list as tappable pills: one tap instead of opening a select. When
 *  `clearable`, tapping the chosen pill again (or the clear button) unsets it. `inline` puts the
 *  label and pills on one row, for a short label and a couple of options. */
let {
	label,
	name,
	options,
	value = $bindable(''),
	clearable = false,
	inline = false
}: {
	label: string
	name: string
	options: readonly { value: string; label: string }[]
	value?: string
	clearable?: boolean
	inline?: boolean
} = $props()

const labelId = $derived(`${name}-label`)
</script>

<div
	class={inline ? 'flex items-center justify-between gap-3' : 'flex flex-col gap-3'}
	role="group"
	aria-labelledby={labelId}
>
	<div class="flex items-center justify-between gap-2">
		<span id={labelId} class="text-xs uppercase tracking-widest text-gray-500">{label}</span>
		{#if clearable}
			<ClearButton {label} active={value !== ''} onclick={() => (value = '')} />
		{/if}
	</div>
	<input type="hidden" {name} {value} />
	<!-- One row, never wrapped. When it's wider than the form (phones), it scrolls sideways and
	     bleeds to the screen edge past the page's px-4, so the clipped pill signals there's more.
	     Inline rows sit beside their label and are short enough to never need it. -->
	<div
		class={inline
			? 'flex gap-2'
			: '-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden'}
	>
		{#each options as option (option.value)}
			<button
				type="button"
				aria-pressed={value === option.value}
				onclick={() => (value = clearable && value === option.value ? '' : option.value)}
				class="min-h-11 min-w-11 shrink-0 whitespace-nowrap rounded-full border border-dark-ink px-3 py-2 text-sm transition-colors {value ===
				option.value
					? 'bg-dark-ink text-off-white'
					: 'bg-transparent text-dark-ink'}"
			>
				{option.label}
			</button>
		{/each}
	</div>
</div>
