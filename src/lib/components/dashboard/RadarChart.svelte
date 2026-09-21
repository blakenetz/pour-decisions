<script lang="ts">
let {
	data,
	maxValue = 5,
	size = 280
}: {
	data: { name: string; avgScore: number }[]
	maxValue?: number
	size?: number
} = $props()

const center = $derived(size / 2)
const padding = 56
const maxRadius = $derived(center - padding)
const gridLevels = [0.2, 0.4, 0.6, 0.8, 1]

function pointAt(index: number, radiusFraction: number) {
	const angle = -Math.PI / 2 + index * ((2 * Math.PI) / data.length)
	return {
		x: center + maxRadius * radiusFraction * Math.cos(angle),
		y: center + maxRadius * radiusFraction * Math.sin(angle)
	}
}

function labelAnchor(index: number): 'start' | 'middle' | 'end' {
	const angle = -Math.PI / 2 + index * ((2 * Math.PI) / data.length)
	const cos = Math.cos(angle)
	if (Math.abs(cos) < 0.2) return 'middle'
	return cos > 0 ? 'start' : 'end'
}

const axisPoints = $derived(data.map((_, i) => pointAt(i, 1)))
const dataPoints = $derived(
	data.map((d, i) => pointAt(i, Math.max(0, Math.min(1, d.avgScore / maxValue))))
)
const dataPolygon = $derived(dataPoints.map((p) => `${p.x},${p.y}`).join(' '))
</script>

{#if data.length >= 3}
	<svg viewBox="0 0 {size} {size}" width={size} height={size} class="overflow-visible">
		{#each gridLevels as level (level)}
			<circle
				cx={center}
				cy={center}
				r={maxRadius * level}
				fill="none"
				stroke="#e5e7eb"
				stroke-width="1"
			/>
		{/each}
		{#each axisPoints as point, i (data[i].name)}
			<line x1={center} y1={center} x2={point.x} y2={point.y} stroke="#e5e7eb" stroke-width="1" />
		{/each}
		<polygon points={dataPolygon} fill="rgb(59 130 246 / 0.25)" stroke="rgb(59 130 246)" stroke-width="2" />
		{#each dataPoints as point, i (data[i].name)}
			<circle cx={point.x} cy={point.y} r="3" fill="rgb(59 130 246)" />
		{/each}
		{#each data as d, i (d.name)}
			{@const p = pointAt(i, 1.16)}
			<text
				x={p.x}
				y={p.y}
				text-anchor={labelAnchor(i)}
				dominant-baseline="middle"
				class="text-[10px] fill-gray-600"
			>
				{d.name} ({d.avgScore.toFixed(1)})
			</text>
		{/each}
	</svg>
{:else}
	<p class="text-sm text-gray-400">Not enough variety yet to chart.</p>
{/if}
