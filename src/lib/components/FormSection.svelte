<script lang="ts">
import type { Snippet } from 'svelte'

/** A collapsible group of optional form fields. Fields inside a closed section still submit. */
let {
	title,
	open = $bindable(false),
	children
}: { title: string; open?: boolean; children: Snippet } = $props()
</script>

<details class="group border-t border-gray-200" bind:open>
	<summary
		class="flex min-h-11 cursor-pointer select-none items-center gap-2 py-3 text-sm font-semibold uppercase tracking-widest text-gray-500 list-none [&::-webkit-details-marker]:hidden"
	>
		<span class="text-lg leading-none transition-transform group-open:rotate-45" aria-hidden="true"
			>+</span
		>
		{title}
	</summary>
	<div class="flex flex-col gap-6 pt-3 pb-8">
		{@render children()}
	</div>
</details>
