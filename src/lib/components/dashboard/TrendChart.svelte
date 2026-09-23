<script lang="ts">
import { LineChart, Tooltip } from 'layerchart'
import type { Metric } from '$lib/dashboard/analysis'

let {
	points,
	metric
}: {
	points: { month: Date; value: number; count: number }[]
	metric: Metric
} = $props()

const domain = $derived.by((): [number, number] => {
	if (points.length === 0) return metric.domain
	const values = points.map((p) => p.value)
	const min = Math.min(...values)
	const max = Math.max(...values)
	const pad = Math.max((max - min) * 0.3, metric.id === 'buyAgain' ? 5 : 0.3)
	return [Math.max(metric.domain[0], min - pad), Math.min(metric.domain[1], max + pad)]
})
</script>

{#if points.length < 2}
	<p class="text-sm text-gray-400 py-8">
		Not enough months in this slice to show a trend yet.
	</p>
{:else}
	<LineChart
		data={points}
		x="month"
		y="value"
		yDomain={domain}
		height={200}
		padding={{ left: 36, bottom: 24, top: 8, right: 8 }}
		motion={{ type: 'tween', duration: 400 }}
		props={{
			spline: {
				class: 'stroke-dark-ink stroke-2',
				motion: { type: 'tween', duration: 400 }
			},
			xAxis: { format: 'month', motion: { type: 'tween', duration: 400 } },
			yAxis: { motion: { type: 'tween', duration: 400 } }
		}}
	>
		{#snippet tooltip()}
			<Tooltip.Root>
				{#snippet children({ data })}
					<Tooltip.Header value={data.month} format="month-year" />
					<Tooltip.List>
						<Tooltip.Item label={metric.label} value={metric.format(data.value)} format="none" />
						<Tooltip.Item label="Pours" value={data.count} format="none" />
					</Tooltip.List>
				{/snippet}
			</Tooltip.Root>
		{/snippet}
	</LineChart>
{/if}
