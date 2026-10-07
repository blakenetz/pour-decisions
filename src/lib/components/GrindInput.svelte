<script lang="ts">
import { GRIND_SIZES } from '$lib/types/coffee'
import { GRINDERS, type GrinderId, grindBand } from '$lib/types/grinders'

let {
	grinder = $bindable(''),
	grindSize = $bindable(''),
	grindSetting = $bindable(''),
	sizePlaceholder,
	inputClass,
	labelClass
}: {
	grinder?: GrinderId | ''
	grindSize?: string
	/** The dial label, e.g. "14" or "4.2"; blank when unset. */
	grindSetting?: string
	/** Blank option of the descriptive size list, e.g. "Select a size" or "No default". */
	sizePlaceholder: string
	inputClass: string
	labelClass: string
} = $props()

const selected = $derived(grinder ? GRINDERS[grinder] : undefined)
const range = $derived(
	selected ? `${selected.positions[0].label}–${selected.positions.at(-1)?.label}` : ''
)
// Shown next to the setting so the shared band it's filed under (the dashboard's axis) is visible.
const band = $derived(grinder && grindSetting ? grindBand(grinder, grindSetting) : undefined)
</script>

<div class="grid grid-cols-2 gap-6">
	<div class="flex flex-col gap-1">
		<label for="grinder" class={labelClass}>Grinder</label>
		<!-- A setting from one grinder's dial means nothing on another's. -->
		<select
			id="grinder"
			name="grinder"
			class={inputClass}
			bind:value={grinder}
			onchange={() => (grindSetting = '')}
		>
			<option value="">No specific grinder</option>
			{#each Object.entries(GRINDERS) as [id, { name }] (id)}
				<option value={id}>{name}</option>
			{/each}
		</select>
	</div>

	{#if selected}
		<div class="flex flex-col gap-1">
			<label for="grindSetting" class={labelClass}>{selected.unit} ({range})</label>
			<select id="grindSetting" name="grindSetting" class={inputClass} bind:value={grindSetting}>
				<option value="">Select a setting</option>
				{#each selected.positions as { label } (label)}
					<option value={label}>{label}</option>
				{/each}
			</select>
			{#if band}
				<span class="text-[10px] text-gray-400 uppercase tracking-widest">≈ {band}</span>
			{/if}
		</div>
	{:else}
		<div class="flex flex-col gap-1">
			<label for="grindSize" class={labelClass}>Grind Size</label>
			<select id="grindSize" name="grindSize" class={inputClass} bind:value={grindSize}>
				<option value="">{sizePlaceholder}</option>
				{#each GRIND_SIZES as size (size)}
					<option value={size}>{size}</option>
				{/each}
			</select>
		</div>
	{/if}
</div>
