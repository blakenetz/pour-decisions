<script lang="ts">
import { PieChart } from 'layerchart'
import type { DashboardStats } from '$lib/server/dashboardStats'

let { data }: { data: DashboardStats['locationSplit'] } = $props()
</script>

{#if data.length > 0}
	<PieChart
		{data}
		key="location"
		value="count"
		cDomain={['Home', 'Out and about']}
		cRange={['#3b82f6', '#f97316']}
		innerRadius={-20}
		legend
		height={240}
	/>
{/if}
