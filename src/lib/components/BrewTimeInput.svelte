<script lang="ts">
import { untrack } from 'svelte'

let {
	name,
	initialSeconds,
	inputClass
}: {
	/** Form field that receives the total in seconds (blank when unset). */
	name: string
	initialSeconds?: number
	inputClass: string
} = $props()

// Seeded once from the prop: after that the inputs are the source of truth.
const seed = untrack(() => initialSeconds)
let minutes = $state(seed ? String(Math.floor(seed / 60)) : '')
let seconds = $state(seed ? String(seed % 60) : '')

// Posted as a single seconds value so the schema stores one comparable number
// rather than two fields every consumer has to recombine.
const totalSeconds = $derived((Number(minutes) || 0) * 60 + (Number(seconds) || 0) || '')
</script>

<input type="hidden" {name} value={totalSeconds} />
<div class="flex items-baseline gap-2">
	<input
		aria-label="Brew time minutes"
		bind:value={minutes}
		type="number"
		min="0"
		max="120"
		placeholder="3"
		class="{inputClass} w-16 text-right"
	/>
	<span class="text-sm text-gray-500">min</span>
	<input
		aria-label="Brew time seconds"
		bind:value={seconds}
		type="number"
		min="0"
		max="59"
		placeholder="30"
		class="{inputClass} w-16 text-right"
	/>
	<span class="text-sm text-gray-500">sec</span>
</div>
