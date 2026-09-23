<script lang="ts">
import type { PourFact } from '$lib/dashboard/analysis'

let { pours, limit = 12 }: { pours: PourFact[]; limit?: number } = $props()

let expanded = $state(false)

// Best first — when you've drilled into a slice, the question is almost always
// "which of these was the good one".
const sorted = $derived([...pours].sort((a, b) => (b.quality ?? -1) - (a.quality ?? -1)))
const visible = $derived(expanded ? sorted : sorted.slice(0, limit))

function formatTime(seconds: number | null): string {
	if (seconds === null) return '—'
	if (seconds >= 3600) return `${Math.round(seconds / 3600)}h`
	const minutes = Math.floor(seconds / 60)
	const rest = seconds % 60
	return minutes === 0 ? `${rest}s` : `${minutes}:${String(rest).padStart(2, '0')}`
}
</script>

{#if pours.length === 0}
	<p class="text-sm text-gray-400">No pours match these filters.</p>
{:else}
	<div class="overflow-x-auto">
		<table class="w-full text-sm">
			<thead>
				<tr
					class="text-left text-xs uppercase tracking-widest text-gray-500 border-b border-gray-200"
				>
					<th class="py-2 pr-4 font-semibold">Date</th>
					<th class="py-2 pr-4 font-semibold">Coffee</th>
					<th class="py-2 pr-4 font-semibold">Origin</th>
					<th class="py-2 pr-4 font-semibold">Method</th>
					<th class="py-2 pr-4 font-semibold">Grind</th>
					<th class="py-2 pr-4 font-semibold">Time</th>
					<th class="py-2 pr-4 font-semibold text-right">Quality</th>
					<th class="py-2 font-semibold text-right">Rating</th>
				</tr>
			</thead>
			<tbody>
				{#each visible as pour (pour.id)}
					<tr class="border-b border-gray-100">
						<td class="py-2 pr-4 text-gray-500 whitespace-nowrap">{pour.date}</td>
						<td class="py-2 pr-4">
							<span class="block">{pour.productName ?? '—'}</span>
							<span class="block text-xs text-gray-500">{pour.roaster ?? '—'}</span>
						</td>
						<td class="py-2 pr-4">
							<span class="block">{pour.country ?? '—'}</span>
							<span class="block text-xs text-gray-500">
								{[pour.region, pour.process].filter(Boolean).join(' · ') || '—'}
							</span>
						</td>
						<td class="py-2 pr-4">{pour.brewMethod ?? '—'}</td>
						<td class="py-2 pr-4">{pour.grindSize ?? '—'}</td>
						<td class="py-2 pr-4 tabular-nums">{formatTime(pour.brewTimeSeconds)}</td>
						<td class="py-2 pr-4 text-right tabular-nums">
							{pour.quality !== null ? pour.quality.toFixed(2) : '—'}
						</td>
						<td class="py-2 text-right tabular-nums">
							{pour.overall !== null ? `${pour.overall}/10` : '—'}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	{#if sorted.length > limit}
		<button
			type="button"
			onclick={() => (expanded = !expanded)}
			class="text-sm underline text-gray-600 hover:text-dark-ink mt-3 self-start"
		>
			{expanded ? 'Show less' : `Show all ${sorted.length} pours`}
		</button>
	{/if}
{/if}
