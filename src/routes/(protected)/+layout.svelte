<script lang="ts">
import type { Snippet } from 'svelte'
import { onMount } from 'svelte'
import { browser } from '$app/environment'
import { goto } from '$app/navigation'
import { resolve } from '$app/paths'
import { isAuthenticated } from '$lib/auth/auth'

let { children }: { children: Snippet } = $props()

let loading = $state(true)
let authenticated = $state(false)

onMount(async () => {
	if (browser) {
		authenticated = await isAuthenticated()
		if (!authenticated) {
			// Redirect to login with return URL
			const returnUrl = encodeURIComponent(window.location.pathname + window.location.search)
			await goto(resolve(`/?redirect=${returnUrl}`))
		}
		loading = false
	}
})
</script>

{#if loading && browser}
	<div class="flex items-center justify-center min-h-screen">
		<p>Loading...</p>
	</div>
{:else if authenticated || !browser}
	{@render children()}
{:else}
	<!-- Will redirect, but show loading just in case -->
	<div class="flex items-center justify-center min-h-screen">
		<p>Redirecting...</p>
	</div>
{/if}
