<script lang="ts">
import { GRIND_SIZES } from '$lib/types/coffee'
import { GRINDERS, type GrinderId, grindBand } from '$lib/types/grinders'

let {
	grinder = $bindable(''),
	grindSize = $bindable(''),
	grindSetting = $bindable(null),
	sizePlaceholder,
	inputClass,
	labelClass
}: {
	grinder?: GrinderId | ''
	grindSize?: string
	grindSetting?: number | null
	/** Blank option of the descriptive size list, e.g. "Select a size" or "No default". */
	sizePlaceholder: string
	inputClass: string
	labelClass: string
} = $props()

const selected = $derived(grinder ? GRINDERS[grinder] : undefined)
// Shown next to the setting so the shared band it's filed under (the dashboard's axis) is visible.
const band = $derived(
	grinder &&
		selected &&
		grindSetting !== null &&
		grindSetting >= selected.min &&
		grindSetting <= selected.max
		? grindBand(grinder, grindSetting)
		: null
)
</script>

<div class="grid grid-cols-2 gap-6">
	<div class="flex flex-col gap-1">
		<label for="grinder" class={labelClass}>Grinder</label>
		<select id="grinder" name="grinder" class={inputClass} bind:value={grinder}>
			<option value="">No specific grinder</option>
			{#each Object.entries(GRINDERS) as [id, { name }] (id)}
				<option value={id}>{name}</option>
			{/each}
		</select>
	</div>

	{#if selected}
		<div class="flex flex-col gap-1">
			<label for="grindSetting" class={labelClass}>Setting ({selected.min}–{selected.max})</label>
			<input
				id="grindSetting"
				name="grindSetting"
				type="number"
				min={selected.min}
				max={selected.max}
				step={selected.step}
				bind:value={grindSetting}
				class={inputClass}
			/>
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
