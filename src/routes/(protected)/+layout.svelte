<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import { isAuthenticated } from '$lib/auth/auth';

	let loading = true;
	let authenticated = false;

	onMount(async () => {
		if (browser) {
			authenticated = await isAuthenticated();
			if (!authenticated) {
				// Redirect to login with return URL
				const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
				await goto(`/login?redirect=${returnUrl}`);
			}
			loading = false;
		}
	});
</script>

{#if loading && browser}
	<div class="flex items-center justify-center min-h-screen">
		<p>Loading...</p>
	</div>
{:else if authenticated || !browser}
	<slot />
{:else}
	<!-- Will redirect, but show loading just in case -->
	<div class="flex items-center justify-center min-h-screen">
		<p>Redirecting...</p>
	</div>
{/if}
