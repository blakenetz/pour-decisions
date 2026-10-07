<script lang="ts">
let {
	value = $bindable(0),
	max = 5
}: {
	value?: number
	max?: number
} = $props()

const scale = $derived(Array.from({ length: max }, (_, i) => i + 1))
</script>

<div class="flex gap-2 flex-wrap">
	{#each scale as n (n)}
		<button
			type="button"
			onclick={() => (value = value === n ? 0 : n)}
			class={`w-9 h-9 rounded-full border transition-colors text-sm ${
				n <= value
					? 'bg-dark-ink text-off-white border-dark-ink'
					: 'bg-transparent text-dark-ink border-dark-ink'
			}`}
		>
			{n}
		</button>
	{/each}
</div>
