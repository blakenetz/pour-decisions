<script module lang="ts">
import type { Feature, Geometry } from 'geojson'
import type { Topology } from 'topojson-specification'

export type CountryFeature = Feature<Geometry, { name: string }>

/** The world atlas is ~108KB of TopoJSON for a single card, so it loads as its
 *  own chunk rather than being bundled into the dashboard route. Kicked off once
 *  per module, not per instance, and awaited in the template. */
const worldCountries: Promise<CountryFeature[]> = Promise.all([
	import('world-atlas/countries-110m.json'),
	import('topojson-client')
]).then(([atlas, topojson]) => {
	const topology = (atlas.default ?? atlas) as unknown as Topology
	const collection = topojson.feature(topology, topology.objects.countries)
	return (collection as unknown as { features: CountryFeature[] }).features
})
</script>

<script lang="ts">
import { geoNaturalEarth1 } from 'd3-geo'
import { Chart, Layer, Tooltip } from 'layerchart'
import { GeoPath } from 'layerchart/geo'
import {
	DIMENSIONS,
	type Group,
	groupBy,
	type Metric,
	MIN_CONFIDENT_GROUP,
	type PourFact
} from '$lib/dashboard/analysis'

let {
	facts,
	metric,
	onselect
}: {
	facts: PourFact[]
	metric: Metric
	/** Clicking a country drills into it, matching the breakdown chart. */
	onselect?: (country: string) => void
} = $props()


const groups = $derived(groupBy(facts, DIMENSIONS.country, metric))

const byCountry = $derived(new Map(groups.map((group) => [group.name, group])))

// Scale across the observed range rather than the metric's full domain: every
// quality average sits between 3 and 5, which would otherwise render as a
// uniform block of near-identical shading.
const extent = $derived.by((): [number, number] => {
	const values = groups
		.map((group) => group.value)
		.filter((value): value is number => value !== null)
	if (values.length === 0) return [0, 1]
	const min = Math.min(...values)
	const max = Math.max(...values)
	return min === max ? [min - 1, max] : [min, max]
})

/** Ink opacity for a country, or `null` when nothing was logged from there. */
function shadeOf(group: Group | undefined): number | null {
	if (!group || group.value === null) return null
	const [min, max] = extent
	return 0.2 + ((group.value - min) / (max - min)) * 0.8
}

const loggedCount = $derived(groups.length)
</script>

{#if loggedCount === 0}
	<p class="text-sm text-gray-400 py-8">No pours in this slice record an origin.</p>
{:else}
	{#await worldCountries}
		<p class="text-sm text-gray-400 py-8">Loading map…</p>
	{:then countries}
	<!-- `tooltipContext` must stay a boolean: passing `{ mode: 'manual' }` stops
	     GeoPath's pointer handlers from ever populating tooltip data. -->
	<Chart
		geo={{ projection: geoNaturalEarth1, fitGeojson: { type: 'FeatureCollection', features: countries } }}
		height={280}
		tooltipContext
	>
		<Layer>
			{#each countries as country (country.id ?? country.properties.name)}
				{@const group = byCountry.get(country.properties.name)}
				{@const shade = shadeOf(group)}
				<GeoPath
					geojson={country}
					tooltip
					fill={shade === null ? '#e7e2d8' : '#262626'}
					fillOpacity={shade ?? 1}
					class="stroke-off-white {group ? 'cursor-pointer' : ''}"
					strokeWidth={0.4}
					onclick={() => group && onselect?.(country.properties.name)}
				/>
			{/each}
		</Layer>

		<Tooltip.Root>
			{#snippet children({ data }: { data: CountryFeature })}
				{@const group = byCountry.get(data.properties.name)}
				<Tooltip.Header value={data.properties.name} format="none" />
				{#if group}
					<Tooltip.List>
						<Tooltip.Item
							label={metric.label}
							value={group.value === null ? '—' : metric.format(group.value)}
							format="none"
						/>
						<Tooltip.Item label="Pours" value={group.count} format="none" />
					</Tooltip.List>
					{#if group.count < MIN_CONFIDENT_GROUP}
						<p class="text-[10px] text-gray-400 px-2 pb-1">
							Only {group.count} pour{group.count === 1 ? '' : 's'} — not yet conclusive
						</p>
					{:else}
						<p class="text-[10px] text-gray-400 px-2 pb-1">Click to drill in</p>
					{/if}
				{:else}
					<p class="text-[10px] text-gray-400 px-2 pb-1">No pours logged</p>
				{/if}
			{/snippet}
		</Tooltip.Root>
	</Chart>

	<p class="text-xs text-gray-500 mt-2 max-w-xl">
		{loggedCount} origin{loggedCount === 1 ? '' : 's'} logged — darker is a higher
		{metric.label.toLowerCase()}. Unshaded countries have no pours.
	</p>
	{/await}
{/if}
