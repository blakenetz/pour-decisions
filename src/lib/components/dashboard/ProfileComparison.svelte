<script lang="ts">
import { BarChart, Tooltip } from 'layerchart'
import { type PourFact, profileOf } from '$lib/dashboard/analysis'

let {
	selection,
	baseline,
	selectionLabel = 'This slice',
	baselineLabel = 'All pours'
}: {
	selection: PourFact[]
	baseline: PourFact[]
	selectionLabel?: string
	baselineLabel?: string
} = $props()

// Comparing an unfiltered selection against itself would draw two identical bars
// per axis, which reads as a distinction that isn't there — so the baseline
// series only appears once a filter has actually narrowed the selection.
const identical = $derived(selection.length === baseline.length)

// Long-form rows so the two profiles group side by side on each axis without
// pivoting into a column per series.
const data = $derived.by(() => {
	const selected = profileOf(selection)
	if (identical) {
		return selected.map((row) => ({ axis: row.axis, series: selectionLabel, value: row.value }))
	}
	const all = profileOf(baseline)
	return selected.flatMap((row, index) => [
		{ axis: row.axis, series: selectionLabel, value: row.value },
		{ axis: row.axis, series: baselineLabel, value: all[index].value }
	])
})
</script>

{#if selection.length === 0}
	<p class="text-sm text-gray-400 py-8">No pours in this slice.</p>
{:else}
	<BarChart
		{data}
		x="axis"
		x1="series"
		y="value"
		c="series"
		seriesLayout="group"
		yDomain={[0, 5]}
		cRange={['#1f2937', '#cbd5e1']}
		height={240}
		padding={{ left: 32, bottom: 28, top: 8, right: 8 }}
		legend={!identical}
		motion="spring"
		props={{
			xAxis: { format: 'none' },
			bars: {
				key: (d) => `${d.axis}-${d.series}`,
				motion: { type: 'spring', stiffness: 0.3, damping: 0.6 }
			}
		}}
	>
		{#snippet tooltip()}
			<Tooltip.Root>
				{#snippet children({ data })}
					<Tooltip.Header value={data.axis} format="none" />
					<Tooltip.List>
						<Tooltip.Item label={data.series} value={data.value.toFixed(2)} format="none" />
					</Tooltip.List>
				{/snippet}
			</Tooltip.Root>
		{/snippet}
	</BarChart>
	<p class="text-xs text-gray-500 mt-1">
		{#if identical}
			How loud your cups run across each descriptive axis, 1–5. Filter above to compare a slice
			against this baseline.
		{:else}
			Descriptive character of this slice against your whole log, 1–5. Higher is louder, not better.
		{/if}
	</p>
{/if}
