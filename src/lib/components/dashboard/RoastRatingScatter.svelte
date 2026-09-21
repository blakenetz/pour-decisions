<script lang="ts">
import { ScatterChart } from 'layerchart'
import type { DashboardStats } from '$lib/server/dashboardStats'

let { data }: { data: DashboardStats['roastVsRating'] } = $props()
</script>

{#if data.length > 0}
	<ScatterChart {data} x="roastLevel" y="rating" xDomain={[1, 10]} yDomain={[1, 5]} height={280} />
{:else}
	<p class="text-sm text-gray-400">Not enough roast-level data yet to chart.</p>
{/if}
