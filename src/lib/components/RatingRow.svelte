<script lang="ts">
import ScaleInput from './ScaleInput.svelte'

let {
	name,
	label,
	value = $bindable(0),
	max = 5
}: {
	name: string
	label: string
	value?: number
	max?: number
} = $props()
</script>

<div class="flex flex-col gap-3">
	<span class="text-xs uppercase tracking-widest text-gray-500">{label}</span>
	<input type="hidden" {name} {value} />
	<ScaleInput bind:value {max} />
</div>
