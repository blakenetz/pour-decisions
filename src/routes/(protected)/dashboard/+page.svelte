<script lang="ts">
import { goto } from '$app/navigation'
import { resolve } from '$app/paths'
import { LoopLink } from '$lib'
import cheersImage from '$lib/assets/cup-cheers.png'
import tableLegsImage from '$lib/assets/table-legs.png'
import { signOutUser } from '$lib/auth/auth'
import BreakdownChart from '$lib/components/dashboard/BreakdownChart.svelte'
import NoteGapChart from '$lib/components/dashboard/NoteGapChart.svelte'
import PourTable from '$lib/components/dashboard/PourTable.svelte'
import ProfileComparison from '$lib/components/dashboard/ProfileComparison.svelte'
import RoastQualityScatter from '$lib/components/dashboard/RoastQualityScatter.svelte'
import TrendChart from '$lib/components/dashboard/TrendChart.svelte'
import {
	applyFilters,
	DIMENSION_IDS,
	DIMENSIONS,
	type DimensionId,
	type Filters,
	groupBy,
	METRIC_IDS,
	METRICS,
	type MetricId,
	monthlyTrend,
	overallMetric
} from '$lib/dashboard/analysis'
import { type Finding, findInsights } from '$lib/dashboard/findings'
import type { PageData } from './$types'

const MIN_POURS_FOR_DASHBOARD = 11

let { data }: { data: PageData } = $props()

let filters = $state<Filters>({})
let breakdown = $state<DimensionId>('brewMethod')
let metricId = $state<MetricId>('quality')

const metric = $derived(METRICS[metricId])
const filtered = $derived(applyFilters(data.pours, filters))
const groups = $derived(groupBy(filtered, DIMENSIONS[breakdown], metric))
const trend = $derived(monthlyTrend(filtered, metric))
const findings = $derived(findInsights(data.pours))

const activeFilters = $derived(
	Object.entries(filters).filter(([, value]) => value) as [DimensionId, string][]
)

const headlineValue = $derived(overallMetric(filtered, metric))
const baselineValue = $derived(overallMetric(data.pours, metric))
const delta = $derived(
	headlineValue !== null && baselineValue !== null && activeFilters.length > 0
		? headlineValue - baselineValue
		: null
)

const buyAgain = $derived(overallMetric(filtered, METRICS.buyAgain))

/** Values available for a dimension, given the *other* active filters — so the
 *  option lists never offer a combination that yields zero pours. */
function optionsFor(id: DimensionId): string[] {
	const others = { ...filters }
	delete others[id]
	const values = new Set<string>()
	for (const fact of applyFilters(data.pours, others)) {
		const value = DIMENSIONS[id].value(fact)
		if (value) values.add(value)
	}
	return [...values].sort()
}

function applyFinding(finding: Finding) {
	filters = { ...finding.filters }
	breakdown = finding.breakdown
	metricId = 'quality'
}

function drillInto(name: string) {
	filters = { ...filters, [breakdown]: name }
	// Breaking down by the dimension you just pinned would leave a single bar, so
	// move to the next dimension that still varies within the new slice.
	const next = DIMENSION_IDS.find(
		(id) => id !== breakdown && !filters[id] && optionsFor(id).length > 1
	)
	if (next) breakdown = next
}

async function handleSignOut() {
	await signOutUser()
	await goto(resolve('/'))
}

const selectClass =
	'border-b border-dark-ink bg-transparent py-1 text-sm focus:outline-none min-w-32'
const labelClass = 'text-xs uppercase tracking-widest text-gray-500'
const cardClass = 'border border-gray-200 rounded-lg p-5'
</script>

<section class="flex flex-col items-center min-h-[100dvh] p-4">
	<header
		class="w-full {data.pours.length >= MIN_POURS_FOR_DASHBOARD
			? 'max-w-6xl'
			: 'max-w-2xl'} flex items-center justify-between py-4"
	>
		<h1 class="text-3xl font-bold">Dashboard</h1>
		<div class="flex items-center gap-4">
			<span class="text-sm text-gray-600">{data.user.username}</span>
			<button onclick={handleSignOut} class="text-sm underline hover:text-gray-600">
				Sign Out
			</button>
		</div>
	</header>

	{#if data.pours.length === 0}
		<main class="flex-1 flex flex-col items-center justify-center gap-6 w-full max-w-2xl">
			<img src={tableLegsImage} alt="" aria-hidden="true" class="h-96 w-auto" />
			<div class="text-center">
				<h2 class="text-3xl">No pours yet.</h2>
				<p class="text-gray-500 mt-1">Log your first pour to get started.</p>
			</div>
			<LoopLink as="a" href="/pours/new">Log a Pour</LoopLink>
		</main>
	{:else if data.pours.length < MIN_POURS_FOR_DASHBOARD}
		<main class="flex-1 flex flex-col items-center justify-center gap-6 w-full max-w-2xl">
			<img src={cheersImage} alt="" aria-hidden="true" class="h-96 w-auto" />
			<div class="text-center">
				<h2 class="text-3xl">Not enough data.</h2>
				<p class="text-gray-500 mt-1">
					Pour a few more: {data.pours.length}/{MIN_POURS_FOR_DASHBOARD} pours
				</p>
			</div>
			<LoopLink as="a" href="/pours/new">Log a Pour</LoopLink>
		</main>
	{:else}
		<main class="flex-1 flex flex-col gap-8 w-full max-w-6xl py-6">
			{#if findings.length > 0}
				<section class="flex flex-col gap-3">
					<h2 class="text-xl font-bold">What your log says</h2>
					<div class="grid gap-3 md:grid-cols-2">
						{#each findings as finding (finding.id)}
							<button
								type="button"
								onclick={() => applyFinding(finding)}
								class="{cardClass} text-left hover:border-dark-ink transition-colors"
							>
								<p class="font-semibold">{finding.headline}</p>
								<p class="text-sm text-gray-600 mt-1">{finding.detail}</p>
								<p class="text-xs text-gray-400 mt-2 underline">Show me</p>
							</button>
						{/each}
					</div>
				</section>
			{/if}

			<section class="flex flex-col gap-4">
				<div class="flex flex-wrap items-end justify-between gap-4">
					<h2 class="text-xl font-bold">Explore</h2>
					<div class="flex flex-wrap items-end gap-5">
						<div class="flex flex-col gap-1">
							<label for="metric" class={labelClass}>Measure</label>
							<select id="metric" bind:value={metricId} class={selectClass}>
								{#each METRIC_IDS as id (id)}
									<option value={id}>{METRICS[id].label}</option>
								{/each}
							</select>
						</div>
						<div class="flex flex-col gap-1">
							<label for="breakdown" class={labelClass}>Broken down by</label>
							<select id="breakdown" bind:value={breakdown} class={selectClass}>
								{#each DIMENSION_IDS as id (id)}
									<option value={id}>{DIMENSIONS[id].label}</option>
								{/each}
							</select>
						</div>
					</div>
				</div>

				<div class="flex flex-wrap gap-5">
					{#each DIMENSION_IDS as id (id)}
						{@const options = optionsFor(id)}
						{#if options.length > 1 || filters[id]}
							<div class="flex flex-col gap-1">
								<label for="filter-{id}" class={labelClass}>{DIMENSIONS[id].label}</label>
								<select
									id="filter-{id}"
									value={filters[id] ?? ''}
									onchange={(event) => {
										const value = event.currentTarget.value
										filters = { ...filters, [id]: value || undefined }
									}}
									class={selectClass}
								>
									<option value="">All</option>
									{#each options as option (option)}
										<option value={option}>{option}</option>
									{/each}
								</select>
							</div>
						{/if}
					{/each}
				</div>

				{#if activeFilters.length > 0}
					<div class="flex flex-wrap items-center gap-2">
						{#each activeFilters as [id, value] (id)}
							<button
								type="button"
								onclick={() => {
									filters = { ...filters, [id]: undefined }
								}}
								class="text-xs border border-dark-ink rounded-full px-3 py-1 hover:bg-dark-ink hover:text-off-white transition-colors"
							>
								{DIMENSIONS[id].label}: {value} &times;
							</button>
						{/each}
						<button
							type="button"
							onclick={() => (filters = {})}
							class="text-xs underline text-gray-500 hover:text-dark-ink"
						>
							Clear all
						</button>
					</div>
				{/if}

				<div class="flex flex-wrap gap-8 items-baseline">
					<div>
						<p class="text-sm text-gray-500">{metric.label}</p>
						<p class="text-3xl font-bold">
							{headlineValue !== null ? metric.format(headlineValue) : '—'}
							{#if delta !== null && Math.abs(delta) >= 0.01}
								<span
									class="text-sm font-normal {delta >= 0 ? 'text-green-600' : 'text-red-600'}"
								>
									{delta >= 0 ? '▲' : '▼'}{metric.format(Math.abs(delta))} vs all pours
								</span>
							{/if}
						</p>
					</div>
					<div>
						<p class="text-sm text-gray-500">Pours in view</p>
						<p class="text-3xl font-bold">{filtered.length}</p>
					</div>
					<div>
						<p class="text-sm text-gray-500">Would buy again</p>
						<p class="text-3xl font-bold">
							{buyAgain !== null ? `${Math.round(buyAgain)}%` : '—'}
						</p>
					</div>
				</div>

				<div class={cardClass}>
					<div class="flex items-baseline justify-between gap-4 mb-2">
						<h3 class="font-semibold">
							{metric.label} by {DIMENSIONS[breakdown].label}
						</h3>
						<span class="text-xs text-gray-400">Click a bar to drill in</span>
					</div>
					<BreakdownChart {groups} {metric} onselect={drillInto} />
					<p class="text-xs text-gray-500 mt-2">{metric.description}</p>
				</div>
			</section>

			<section class="grid gap-6 lg:grid-cols-2">
				<div class={cardClass}>
					<h3 class="font-semibold mb-2">Roast level vs quality</h3>
					<RoastQualityScatter facts={filtered} />
					<p class="text-xs text-gray-500 mt-2">
						Each point is a pour. Filter to an origin to see whether you actually prefer it light
						or dark.
					</p>
				</div>

				<div class={cardClass}>
					<h3 class="font-semibold mb-2">{metric.label} over time</h3>
					<TrendChart points={trend} {metric} />
				</div>
			</section>

			<section class="grid gap-6 lg:grid-cols-2">
				<div class={cardClass}>
					<h3 class="font-semibold mb-2">Cup profile</h3>
					<ProfileComparison selection={filtered} baseline={data.pours} />
				</div>

				<div class={cardClass}>
					<h3 class="font-semibold mb-2">Your palate vs the bag</h3>
					<NoteGapChart facts={filtered} />
					<p class="text-xs text-gray-500 mt-2">
						Notes the roaster printed against notes you actually recorded.
					</p>
				</div>
			</section>

			<section class="flex flex-col gap-2">
				<h2 class="text-xl font-bold">
					Pours in view
					<span class="text-sm font-normal text-gray-500">({filtered.length})</span>
				</h2>
				<PourTable pours={filtered} />
			</section>
		</main>

		<footer class="w-full max-w-6xl py-8 flex flex-col items-center gap-3 text-center">
			<p class="text-gray-500">Ready for another?</p>
			<LoopLink as="a" href="/pours/new">Log a Pour</LoopLink>
		</footer>
	{/if}
</section>
