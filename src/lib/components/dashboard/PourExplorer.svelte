<script lang="ts">
interface PourRow {
	entryId: string
	date: string
	roaster: string | null
	region: string | null
	brewMethod: string | null
	location: string | null
	overallRating: number | null
	avgCategoryRating: number | null
}

let { pours }: { pours: PourRow[] } = $props()

let regionFilter = $state('all')
let brewMethodFilter = $state('all')
let locationFilter = $state('all')

function distinctValues(key: 'region' | 'brewMethod' | 'location'): string[] {
	const values = new Set<string>()
	for (const pour of pours) {
		const value = pour[key]
		if (value) values.add(value)
	}
	return [...values].sort()
}

const regions = $derived(distinctValues('region'))
const brewMethods = $derived(distinctValues('brewMethod'))
const locations = $derived(distinctValues('location'))

const filtered = $derived(
	pours.filter(
		(pour) =>
			(regionFilter === 'all' || pour.region === regionFilter) &&
			(brewMethodFilter === 'all' || pour.brewMethod === brewMethodFilter) &&
			(locationFilter === 'all' || pour.location === locationFilter)
	)
)

function mean(values: number[]): number | null {
	if (values.length === 0) return null
	return values.reduce((sum, v) => sum + v, 0) / values.length
}

const avgOverall = $derived(
	mean(filtered.map((p) => p.overallRating).filter((v): v is number => v !== null))
)

const selectClass = 'border-b border-dark-ink bg-transparent py-1 text-sm focus:outline-none'
const labelClass = 'text-xs uppercase tracking-widest text-gray-500'
</script>

<div class="flex flex-col gap-4">
	<div class="flex flex-wrap gap-6">
		<div class="flex flex-col gap-1">
			<label for="explore-region" class={labelClass}>Region</label>
			<select id="explore-region" bind:value={regionFilter} class={selectClass}>
				<option value="all">All</option>
				{#each regions as region (region)}
					<option value={region}>{region}</option>
				{/each}
			</select>
		</div>
		<div class="flex flex-col gap-1">
			<label for="explore-brew" class={labelClass}>Brew Method</label>
			<select id="explore-brew" bind:value={brewMethodFilter} class={selectClass}>
				<option value="all">All</option>
				{#each brewMethods as method (method)}
					<option value={method}>{method}</option>
				{/each}
			</select>
		</div>
		<div class="flex flex-col gap-1">
			<label for="explore-location" class={labelClass}>Location</label>
			<select id="explore-location" bind:value={locationFilter} class={selectClass}>
				<option value="all">All</option>
				{#each locations as location (location)}
					<option value={location}>{location}</option>
				{/each}
			</select>
		</div>
	</div>

	<p class="text-sm text-gray-500">
		{filtered.length} pour{filtered.length === 1 ? '' : 's'}
		{#if avgOverall !== null}
			&middot; {avgOverall.toFixed(1)}/10 avg
		{/if}
	</p>

	{#if filtered.length > 0}
		<div class="overflow-x-auto">
			<table class="w-full text-sm">
				<thead>
					<tr class="text-left text-xs uppercase tracking-widest text-gray-500 border-b border-gray-200">
						<th class="py-2 pr-4 font-semibold">Date</th>
						<th class="py-2 pr-4 font-semibold">Roaster</th>
						<th class="py-2 pr-4 font-semibold">Region</th>
						<th class="py-2 pr-4 font-semibold">Brew Method</th>
						<th class="py-2 pr-4 font-semibold">Location</th>
						<th class="py-2 pr-4 font-semibold text-right">Rating</th>
					</tr>
				</thead>
				<tbody>
					{#each filtered as pour (pour.entryId)}
						<tr class="border-b border-gray-100">
							<td class="py-2 pr-4 text-gray-500">{pour.date}</td>
							<td class="py-2 pr-4">{pour.roaster ?? '—'}</td>
							<td class="py-2 pr-4">{pour.region ?? '—'}</td>
							<td class="py-2 pr-4">{pour.brewMethod ?? '—'}</td>
							<td class="py-2 pr-4">{pour.location ?? '—'}</td>
							<td class="py-2 pr-4 text-right">
								{#if pour.overallRating !== null}
									{pour.overallRating}/10
								{:else if pour.avgCategoryRating !== null}
									{pour.avgCategoryRating.toFixed(1)}/5
								{:else}
									—
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{:else}
		<p class="text-sm text-gray-400">No pours match these filters.</p>
	{/if}
</div>
