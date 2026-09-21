<script lang="ts">
import { BarChart } from 'layerchart'
import type { DashboardStats } from '$lib/server/dashboardStats'

let { ratingsByCategory }: { ratingsByCategory: DashboardStats['ratingsByCategory'] } = $props()

const data = $derived(
	ratingsByCategory.map((row) => ({ category: row.category, value: row.value ?? 0 }))
)
</script>

<BarChart {data} x="category" y="value" yDomain={[0, 5]} height={240} />
