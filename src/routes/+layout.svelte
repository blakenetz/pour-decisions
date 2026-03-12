<script lang="ts">
	import type { Snippet } from 'svelte';
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { onMount } from 'svelte';
	import { initAmplify } from '$lib/auth/amplifyClient';

	let { children }: { children: Snippet } = $props();

	let updateAvailable = $state(false);

	onMount(() => {
		initAmplify();
		if ('serviceWorker' in navigator && !import.meta.env.DEV) {
			navigator.serviceWorker
				.register('/sw.js')
				.then((reg) => {
					if (reg.waiting) {
						updateAvailable = true;
					}
					reg.addEventListener('updatefound', () => {
						const installing = reg.installing;
						if (!installing) return;
						installing.addEventListener('statechange', () => {
							if (installing.state === 'installed' && navigator.serviceWorker.controller) {
								updateAvailable = true;
							}
						});
					});
				})
				.catch(() => {
					// registration failed
				});
		}
	});

	function reloadForUpdate() {
		if (navigator.serviceWorker.controller) {
			navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
			// after skipWaiting, listen for controllerchange and reload
			navigator.serviceWorker.addEventListener('controllerchange', () => {
				window.location.reload();
			});
		}
	}
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}

{#if updateAvailable}
	<div
		class="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-white/90 text-sm px-4 py-2 rounded shadow-lg"
	>
		<span>Update available</span>
		<button onclick={reloadForUpdate} class="ml-3 font-medium">Reload</button>
	</div>
{/if}
