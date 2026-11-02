<script lang="ts">
import { BarChart, Tooltip } from 'layerchart'
import type { Group, Metric } from '$lib/dashboard/analysis'

let { groups, metric }: { groups: Group[]; metric: Metric } = $props()

// As in BreakdownChart: a hop no pour rated on this measure is left out rather than drawn as a
// zero bar, which would read as "rated zero" instead of "unrated".
const data = $derived(
	groups
		.filter((group) => group.value !== null)
		.map((group) => ({ name: group.name, value: group.value as number, count: group.count }))
)
const height = $derived(Math.max(160, data.length * 32 + 32))
</script>

{#if data.length === 0}
	<p class="text-sm text-gray-400 py-8">No hops logged in this slice.</p>
{:else}
	<BarChart
		{data}
		x="value"
		y="name"
		orientation="horizontal"
		{height}
		padding={{ left: 104, bottom: 24, top: 4, right: 12 }}
		props={{
			yAxis: { format: 'none' },
			bars: {
				key: (d) => d.name,
				class: 'fill-dark-ink/85',
				rounded: 'right',
				radius: 2,
				motion: { type: 'spring', stiffness: 0.3, damping: 0.6 }
			}
		}}
	>
		{#snippet tooltip()}
			<Tooltip.Root>
				{#snippet children({ data })}
					<Tooltip.Header value={data.name} format="none" />
					<Tooltip.List>
						<Tooltip.Item
							label={metric.label}
							value={metric.value === null ? `${data.count} pours` : data.value.toFixed(2)}
							format="none"
						/>
						<Tooltip.Item label="Pours" value={`${data.count} pours`} format="none" />
					</Tooltip.List>
				{/snippet}
			</Tooltip.Root>
		{/snippet}
	</BarChart>
{/if}
