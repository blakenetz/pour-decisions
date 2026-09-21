<script lang="ts">
import { LineChart } from 'layerchart'
import type { DashboardStats } from '$lib/server/dashboardStats'

let { scoreByMonth }: { scoreByMonth: DashboardStats['scoreByMonth'] } = $props()
</script>

<LineChart data={scoreByMonth} x="month" y="avgScore" yDomain={[0, 5]} height={240} />
