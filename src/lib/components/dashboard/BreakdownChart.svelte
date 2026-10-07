<script lang="ts">
import { BarChart, Tooltip } from 'layerchart'
import type { Group, Metric } from '$lib/dashboard/analysis'
import { MIN_CONFIDENT_GROUP } from '$lib/dashboard/analysis'

let {
	groups,
	metric,
	onselect
}: {
	groups: Group[]
	metric: Metric
	/** Clicking a bar drills into that group. */
	onselect?: (name: string) => void
} = $props()

// Groups with no value for this metric can't be plotted; keep them out rather
// than drawing a zero bar, which would read as "rated zero" instead of "unrated".
const data = $derived(
	groups
		.filter((group) => group.value !== null)
		.map((group) => ({
			name: group.name,
			value: group.value as number,
			count: group.count,
			sparse: group.count < MIN_CONFIDENT_GROUP
		}))
)

// A value axis anchored at zero flattens the differences that matter — every
// quality score sits between 2 and 5. Pad the observed range instead.
const domain = $derived.by((): [number, number] => {
	if (data.length === 0) return metric.domain
	const values = data.map((d) => d.value)
	const min = Math.min(...values)
	const max = Math.max(...values)
	const pad = Math.max((max - min) * 0.25, metric.id === 'buyAgain' ? 5 : 0.2)
	return [Math.max(metric.domain[0], min - pad), Math.min(metric.domain[1], max + pad)]
})

const height = $derived(Math.max(160, data.length * 38 + 40))
</script>

{#if data.length === 0}
	<p class="text-sm text-gray-400 py-8">No pours in this slice carry a {metric.label.toLowerCase()} score.</p>
{:else}
	<!-- `onBarClick` is swallowed by the tooltip's full-band hit target, which sits
	     above the bars, so `onTooltipClick` is the hook that actually fires. -->
	<BarChart
		{data}
		x="value"
		y="name"
		orientation="horizontal"
		xDomain={domain}
		padding={{ left: 108, bottom: 24, top: 4, right: 44 }}
		{height}
		props={{
			bars: {
				key: (d) => d.name,
				class: 'fill-dark-ink/85 hover:fill-dark-ink transition-colors cursor-pointer',
				rounded: 'right',
				radius: 2,
				motion: { type: 'spring', stiffness: 0.3, damping: 0.6 }
			},
			yAxis: { format: 'none' }
		}}
		onTooltipClick={(_event, detail) => onselect?.(detail.data?.name)}
	>
		{#snippet tooltip({ context })}
			<Tooltip.Root>
				{#snippet children({ data })}
					<Tooltip.Header value={data.name} format="none" />
					<Tooltip.List>
						<Tooltip.Item label={metric.label} value={metric.format(data.value)} format="none" />
						<Tooltip.Item label="Pours" value={data.count} format="none" />
					</Tooltip.List>
					{#if data.sparse}
						<p class="text-[10px] text-warning px-2 pb-1">
							Only {data.count} pour{data.count === 1 ? '' : 's'} — not yet conclusive
						</p>
					{/if}
					{#if context}
						<p class="text-[10px] text-gray-400 px-2 pb-1">Click to drill in</p>
					{/if}
				{/snippet}
			</Tooltip.Root>
		{/snippet}
	</BarChart>
{/if}
