<script lang="ts">
import { BarChart } from 'layerchart'
import type { DashboardStats } from '$lib/server/dashboardStats'

let { avgRatings }: { avgRatings: DashboardStats['avgRatings'] } = $props()

const data = $derived(
	[
		{ label: 'Aroma', value: avgRatings.aroma },
		{ label: 'Flavor', value: avgRatings.flavor },
		{ label: 'Acidity', value: avgRatings.acidity },
		{ label: 'Body', value: avgRatings.body },
		{ label: 'Finish', value: avgRatings.finish }
	].map((row) => ({ label: row.label, value: row.value ?? 0 }))
)
</script>

<BarChart {data} x="label" y="value" yDomain={[0, 5]} height={240} />
