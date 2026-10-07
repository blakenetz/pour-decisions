<script lang="ts">
import { BarChart, Tooltip } from 'layerchart'
import { compareNotes, type PourFact } from '$lib/dashboard/analysis'

let { facts }: { facts: PourFact[] } = $props()

const rows = $derived(compareNotes(facts))

const data = $derived(
	rows.flatMap((row) => [
		{ note: row.note, series: 'On the bag', value: row.bag },
		{ note: row.note, series: 'You tasted', value: row.you }
	])
)

const height = $derived(Math.max(200, rows.length * 44 + 40))
</script>

{#if rows.length === 0}
	<p class="text-sm text-gray-400 py-8">
		No flavor notes logged yet — add your own notes when logging a pour to compare them against the
		roaster's.
	</p>
{:else}
	<BarChart
		{data}
		x="value"
		y="note"
		y1="series"
		c="series"
		orientation="horizontal"
		seriesLayout="group"
		cRange={['#cbd5e1', '#1f2937']}
		{height}
		padding={{ left: 104, bottom: 24, top: 4, right: 12 }}
		legend
		props={{
			yAxis: { format: 'none' },
			bars: {
				key: (d) => `${d.note}-${d.series}`,
				motion: { type: 'spring', stiffness: 0.3, damping: 0.6 }
			}
		}}
	>
		{#snippet tooltip()}
			<Tooltip.Root>
				{#snippet children({ data })}
					<Tooltip.Header value={data.note} format="none" />
					<Tooltip.List>
						<Tooltip.Item label={data.series} value={`${data.value} pours`} format="none" />
					</Tooltip.List>
				{/snippet}
			</Tooltip.Root>
		{/snippet}
	</BarChart>
{/if}
