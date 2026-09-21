<script lang="ts">
import { BarChart } from 'layerchart'

let {
	data,
	min = 1,
	max = 5,
	center = 3
}: {
	data: { label: string; value: number | null }[]
	min?: number
	max?: number
	center?: number
} = $props()

const chartData = $derived(
	data
		.filter((row): row is { label: string; value: number } => row.value !== null)
		.map((row) => ({
			label: row.label,
			delta: row.value - center,
			sign: row.value >= center ? 'Above average' : 'Below average'
		}))
)
</script>

{#if chartData.length > 0}
	<BarChart
		data={chartData}
		x="delta"
		y="label"
		c="sign"
		cDomain={['Below average', 'Above average']}
		cRange={['#f97316', '#3b82f6']}
		legend
		orientation="horizontal"
		xDomain={[min - center, max - center]}
		labels={{ format: (value: number) => (value + center).toFixed(1) }}
		props={{ xAxis: { format: (value: number) => (value + center).toFixed(0) } }}
		height={Math.max(200, chartData.length * 32)}
	/>
{/if}
