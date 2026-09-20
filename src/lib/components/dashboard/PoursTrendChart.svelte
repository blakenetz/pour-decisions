<script lang="ts">
import { BarChart } from 'layerchart'
import type { DashboardStats } from '$lib/server/dashboardStats'

let { poursByMonth }: { poursByMonth: DashboardStats['poursByMonth'] } = $props()
</script>

<BarChart data={poursByMonth} x="month" y="count" height={240} />
