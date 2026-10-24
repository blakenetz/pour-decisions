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

<!-- 44px is the minimum comfortable tap target; at that size ten don't fit a phone row, so
     phones get rows of five spread edge to edge. Wider screens are pointer-driven: 40px keeps
     five in a half-width column and ten in one row. -->
<div class="grid grid-cols-[repeat(5,auto)] justify-between gap-y-3 sm:flex sm:flex-wrap sm:gap-2">
	{#each scale as n (n)}
		<button
			type="button"
			onclick={() => (value = value === n ? 0 : n)}
			class={`size-11 sm:size-10 rounded-full border transition-colors text-sm ${
				n <= value
					? 'bg-dark-ink text-off-white border-dark-ink'
					: 'bg-transparent text-dark-ink border-dark-ink'
			}`}
		>
			{n}
		</button>
	{/each}
</div>
