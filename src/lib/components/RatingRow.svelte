<script lang="ts">
import ScaleInput from './ScaleInput.svelte'

let {
	name,
	label,
	value = $bindable(0),
	max = 5,
	required = false
}: {
	name: string
	label: string
	value?: number
	max?: number
	required?: boolean
} = $props()
</script>

<div class="flex flex-col gap-3">
	<span class="text-xs uppercase tracking-widest text-gray-500">
		{label}{#if required}<span class="text-red-500"> *</span>{/if}
	</span>
	<input type="hidden" {name} {value} />
	<ScaleInput bind:value {max} />
</div>
