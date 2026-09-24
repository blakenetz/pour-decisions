<script lang="ts">
import { goto } from '$app/navigation'
import { resolve } from '$app/paths'
import type { Pathname } from '$app/types'
import { signOutUser } from '$lib/auth/auth'

let {
	title,
	/** Route to the page behind this one; renders a back affordance inside the
	 *  bar. Resolved here so callers can't pass an unresolved path. */
	backTo
}: {
	title: string
	backTo?: Pathname
} = $props()
let menuOpen = $state(false)

async function handleSignOut() {
	menuOpen = false
	await signOutUser()
	await goto(resolve('/'))
}
</script>

<!-- Spans the full page width inside the page's own padding, so the bar is
     identical across views regardless of how wide their content is. -->
<header
	class="w-full flex items-center justify-between py-3 px-5 my-2 rounded-lg bg-dark-ink text-off-white"
>
	<div class="flex items-center gap-3">
		{#if backTo}
			<a
				href={resolve(backTo)}
				aria-label="Back"
				class="text-xl leading-none opacity-70 hover:opacity-100 transition-opacity"
			>
				←
			</a>
		{/if}
		<h1 class="text-3xl font-bold">{title}</h1>
	</div>

	<div class="relative">
		<button
			aria-label="Menu"
			aria-expanded={menuOpen}
			onclick={() => (menuOpen = !menuOpen)}
			class="p-2 -m-2 cursor-pointer"
		>
			<svg
				width="22"
				height="22"
				viewBox="0 0 22 22"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
			>
				<line x1="2" y1="5" x2="20" y2="5" />
				<line x1="2" y1="11" x2="20" y2="11" />
				<line x1="2" y1="17" x2="20" y2="17" />
			</svg>
		</button>

		{#if menuOpen}
			<!-- Transparent full-screen hit area, so clicking anywhere dismisses the
			     menu without a document-level listener. -->
			<button
				aria-label="Close menu"
				onclick={() => (menuOpen = false)}
				class="fixed inset-0 z-10 cursor-default"
			></button>
			<div
				class="absolute right-0 top-full mt-2 z-20 w-40 flex flex-col rounded-lg border border-gray-200 bg-off-white text-dark-ink py-1 shadow-lg"
			>
				<a
					href={resolve('/profile')}
					onclick={() => (menuOpen = false)}
					class="px-4 py-2 text-sm hover:bg-gray-100"
				>
					Profile
				</a>
				<button onclick={handleSignOut} class="px-4 py-2 text-sm text-left hover:bg-gray-100 cursor-pointer">
					Sign Out
				</button>
			</div>
		{/if}
	</div>
</header>
