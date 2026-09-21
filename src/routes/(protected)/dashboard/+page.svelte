<script lang="ts">
import { goto } from '$app/navigation'
import { resolve } from '$app/paths'
import { LoopLink } from '$lib'
import cheersImage from '$lib/assets/cup-cheers.png'
import tableLegsImage from '$lib/assets/table-legs.png'
import { signOutUser } from '$lib/auth/auth'
import DivergingBarChart from '$lib/components/dashboard/DivergingBarChart.svelte'
import RadarChart from '$lib/components/dashboard/RadarChart.svelte'
import type { PageData } from './$types'

const MIN_POURS_FOR_DASHBOARD = 11

let { data }: { data: PageData } = $props()

async function handleSignOut() {
	await signOutUser()
	await goto(resolve('/'))
}
</script>

<section class="flex flex-col items-center min-h-[100dvh] p-4">
	<header
		class="w-full {data.pourCount >= MIN_POURS_FOR_DASHBOARD
			? 'max-w-4xl'
			: 'max-w-2xl'} flex items-center justify-between py-4"
	>
		<div class="flex items-center gap-4">
			<h1 class="text-3xl font-bold">Dashboard</h1>
		</div>
		<div class="flex items-center gap-4">
			<span class="text-sm text-gray-600">{data.user.username}</span>
			<button onclick={handleSignOut} class="text-sm underline hover:text-gray-600">
				Sign Out
			</button>
		</div>
	</header>

	{#if data.pourCount === 0}
		<main class="flex-1 flex flex-col items-center justify-center gap-6 w-full max-w-2xl">
			<img src={tableLegsImage} alt="" aria-hidden="true" class="h-96 w-auto" />
			<div class="text-center">
				<h2 class="text-3xl">No pours yet.</h2>
				<p class="text-gray-500 mt-1">Log your first pour to get started.</p>
			</div>
			<LoopLink as="a" href="/pours/new">Log a Pour</LoopLink>
		</main>
	{:else if data.pourCount < MIN_POURS_FOR_DASHBOARD}
		<main class="flex-1 flex flex-col items-center justify-center gap-6 w-full max-w-2xl">
			<img src={cheersImage} alt="" aria-hidden="true" class="h-96 w-auto" />
			<div class="text-center">
				<h2 class="text-3xl">Not enough data.</h2>
				<p class="text-gray-500 mt-1">
					Pour a few more: {data.pourCount}/{MIN_POURS_FOR_DASHBOARD} pours
				</p>
			</div>
			<LoopLink as="a" href="/pours/new">Log a Pour</LoopLink>
		</main>
	{:else}
		<main class="flex-1 flex flex-col gap-8 w-full max-w-4xl py-8">
			<div class="flex gap-8">
				<div>
					<p class="text-sm text-gray-500">Total Pours</p>
					<p class="text-3xl font-bold">{data.stats.totalPours}</p>
				</div>
				<div>
					<p class="text-sm text-gray-500">Avg Category Rating</p>
					<p class="text-3xl font-bold">
						{data.stats.avgCategoryRating?.toFixed(1) ?? '—'}
						{#if data.stats.avgCategoryRatingTrend !== null && Math.abs(data.stats.avgCategoryRatingTrend) >= 0.05}
							{@const trend = data.stats.avgCategoryRatingTrend}
							<span class="text-sm font-normal {trend >= 0 ? 'text-green-600' : 'text-red-600'}">
								{trend >= 0 ? '▲' : '▼'}
								{Math.abs(trend).toFixed(1)}
							</span>
						{/if}
					</p>
				</div>
				<div>
					<p class="text-sm text-gray-500">Avg Roast Level</p>
					<p class="text-3xl font-bold">{data.stats.avgRoastLevel?.toFixed(1) ?? '—'}</p>
				</div>
			</div>

			{#if data.stats.personalBest}
				{@const best = data.stats.personalBest}
				<div class="border border-gray-200 rounded-lg p-4">
					<p class="text-sm text-gray-500">Personal Best</p>
					<p class="text-2xl font-bold">{best.score.toFixed(1)}</p>
					<p class="text-sm text-gray-600">
						{[best.roaster, best.region].filter(Boolean).join(' · ') || 'Unnamed pour'} — {best.date}
					</p>
				</div>
			{/if}

			<div>
				<h2 class="text-xl font-bold mb-2">Ratings</h2>
				<DivergingBarChart data={data.stats.ratingBreakdown} />
			</div>

			{#if data.stats.bestBrewMethod || data.stats.bestRoastBand || data.stats.topFlavorNotes.length > 0}
				<div>
					<h2 class="text-xl font-bold mb-2">What You Love</h2>
					<div class="flex gap-8">
						{#if data.stats.bestBrewMethod}
							{@const method = data.stats.bestBrewMethod}
							<div class="flex-1">
								<p class="text-sm text-gray-500">Best Brew Method</p>
								<p class="text-lg font-semibold">{method.name}</p>
								<p class="text-sm text-gray-500">{method.avgScore.toFixed(1)} avg · {method.count} pours</p>
							</div>
						{/if}
						{#if data.stats.bestRoastBand}
							{@const band = data.stats.bestRoastBand}
							<div class="flex-1">
								<p class="text-sm text-gray-500">Best Roast</p>
								<p class="text-lg font-semibold">{band.name}</p>
								<p class="text-sm text-gray-500">{band.avgScore.toFixed(1)} avg · {band.count} pours</p>
							</div>
						{/if}
						{#if data.stats.topFlavorNotes.length > 0}
							<div class="flex-1">
								<p class="text-sm text-gray-500 mb-1">Top Flavor Notes</p>
								<ul class="space-y-1">
									{#each data.stats.topFlavorNotes as note (note.name)}
										<li class="flex justify-between text-sm">
											<span>{note.name}</span>
											<span class="text-gray-500">{note.count}</span>
										</li>
									{/each}
								</ul>
							</div>
						{/if}
					</div>
				</div>
			{/if}

			{#if data.stats.regionScores.length > 0 || data.stats.roasterScores.length > 0}
				<div class="flex gap-8">
					{#if data.stats.regionScores.length > 0}
						<div class="flex-1 flex flex-col items-center">
							<h2 class="text-xl font-bold mb-2 self-start">By Region</h2>
							<RadarChart data={data.stats.regionScores} />
						</div>
					{/if}
					{#if data.stats.roasterScores.length > 0}
						<div class="flex-1 flex flex-col items-center">
							<h2 class="text-xl font-bold mb-2 self-start">By Roaster</h2>
							<RadarChart data={data.stats.roasterScores} />
						</div>
					{/if}
				</div>
			{/if}
		</main>
		<footer class="w-full max-w-4xl py-8 flex flex-col items-center gap-3 text-center">
			<p class="text-gray-500">Ready for another?</p>
			<LoopLink as="a" href="/pours/new">Log a Pour</LoopLink>
		</footer>
	{/if}
</section>
