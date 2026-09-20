<script lang="ts">
import { goto } from '$app/navigation'
import { resolve } from '$app/paths'
import { LoopLink } from '$lib'
import tableLegsImage from '$lib/assets/table-legs.png'
import { signOutUser } from '$lib/auth/auth'
import PoursTrendChart from '$lib/components/dashboard/PoursTrendChart.svelte'
import RatingsBarChart from '$lib/components/dashboard/RatingsBarChart.svelte'
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
			<a href={resolve('/')} class="text-sm underline hover:text-gray-600">← Home</a>
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
			<div class="text-center">
				<h2 class="text-3xl">Not enough data.</h2>
				<p class="text-gray-500 mt-1">
					Pour a few more — {data.pourCount} of {MIN_POURS_FOR_DASHBOARD} logged.
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
					<p class="text-sm text-gray-500">Avg Roast Level</p>
					<p class="text-3xl font-bold">{data.stats.avgRoastLevel?.toFixed(1) ?? '—'}</p>
				</div>
			</div>

			<div>
				<h2 class="text-xl font-bold mb-2">Average Ratings</h2>
				<RatingsBarChart avgRatings={data.stats.avgRatings} />
			</div>

			<div>
				<h2 class="text-xl font-bold mb-2">Pours Over Time</h2>
				<PoursTrendChart poursByMonth={data.stats.poursByMonth} />
			</div>

			<div class="flex gap-8">
				<div class="flex-1">
					<h2 class="text-xl font-bold mb-2">Top Roasters</h2>
					<ul class="space-y-1">
						{#each data.stats.topRoasters as roaster (roaster.name)}
							<li class="flex justify-between text-sm">
								<span>{roaster.name}</span>
								<span class="text-gray-500">{roaster.count}</span>
							</li>
						{/each}
					</ul>
				</div>
				<div class="flex-1">
					<h2 class="text-xl font-bold mb-2">Top Regions</h2>
					<ul class="space-y-1">
						{#each data.stats.topRegions as region (region.name)}
							<li class="flex justify-between text-sm">
								<span>{region.name}</span>
								<span class="text-gray-500">{region.count}</span>
							</li>
						{/each}
					</ul>
				</div>
			</div>
		</main>
	{/if}
</section>
