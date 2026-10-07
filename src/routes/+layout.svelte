<script lang="ts">
import type { Snippet } from 'svelte'
import '../app.css'
import { onMount } from 'svelte'
import favicon from '$lib/assets/favicon.svg'
import { initAmplify } from '$lib/auth/amplifyClient'

let { children }: { children: Snippet } = $props()

/** A newly deployed service worker that is installed and waiting for this page to accept it. */
let waitingWorker = $state.raw<ServiceWorker | null>(null)

onMount(() => {
	initAmplify()
	// Registered here rather than by SvelteKit (kit.serviceWorker.register = false) so the "Update
	// available" prompt can watch for a waiting worker. Dev serves no bundled worker.
	if ('serviceWorker' in navigator && !import.meta.env.DEV) {
		navigator.serviceWorker
			.register('/service-worker.js')
			.then((reg) => {
				if (reg.waiting && navigator.serviceWorker.controller) {
					waitingWorker = reg.waiting
				}
				reg.addEventListener('updatefound', () => {
					const installing = reg.installing
					if (!installing) return
					installing.addEventListener('statechange', () => {
						// With no controller this is the first install, which activates on its own.
						if (installing.state === 'installed' && navigator.serviceWorker.controller) {
							waitingWorker = installing
						}
					})
				})
			})
			.catch(() => {
				// registration failed
			})
	}
})

function reloadForUpdate() {
	navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload(), {
		once: true
	})
	// Only the waiting worker can skip its own waiting phase (see src/service-worker.ts).
	waitingWorker?.postMessage({ type: 'SKIP_WAITING' })
}
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}

{#if waitingWorker}
	<div
		class="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-white/90 text-sm px-4 py-2 rounded shadow-lg"
	>
		<span>Update available</span>
		<button onclick={reloadForUpdate} class="ml-3 font-medium">Reload</button>
	</div>
{/if}
