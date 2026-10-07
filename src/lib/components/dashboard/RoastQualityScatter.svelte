<script lang="ts">
import { ScatterChart, Tooltip } from 'layerchart'
import type { PourFact } from '$lib/dashboard/analysis'

let { facts }: { facts: PourFact[] } = $props()

const data = $derived(
	facts
		.filter((fact) => fact.roastLevel !== null && fact.quality !== null)
		.map((fact) => ({
			id: fact.id,
			roastLevel: fact.roastLevel as number,
			quality: fact.quality as number,
			country: fact.country ?? 'Unknown',
			roaster: fact.roaster ?? 'Unknown',
			productName: fact.productName ?? '—'
		}))
)
</script>

{#if data.length === 0}
	<p class="text-sm text-gray-400 py-8">No pours here record both a roast level and a quality score.</p>
{:else}
	<ScatterChart
		{data}
		x="roastLevel"
		y="quality"
		xDomain={[1, 10]}
		yDomain={[1, 5]}
		height={260}
		padding={{ left: 32, bottom: 32, top: 8, right: 12 }}
		props={{
			points: {
				key: (d) => d.id,
				class: 'fill-dark-ink/60',
				r: 4,
				initialR: 0,
				motion: 'spring'
			},
			xAxis: { label: 'Roast level — light to dark', ticks: [1, 3, 5, 7, 10] },
			yAxis: { label: 'Quality' }
		}}
	>
		{#snippet tooltip()}
			<Tooltip.Root>
				{#snippet children({ data })}
					<Tooltip.Header value={`${data.roaster} — ${data.productName}`} format="none" />
					<Tooltip.List>
						<Tooltip.Item label="Origin" value={data.country} format="none" />
						<Tooltip.Item label="Roast level" value={data.roastLevel} format="none" />
						<Tooltip.Item label="Quality" value={data.quality.toFixed(2)} format="none" />
					</Tooltip.List>
				{/snippet}
			</Tooltip.Root>
		{/snippet}
	</ScatterChart>
{/if}
