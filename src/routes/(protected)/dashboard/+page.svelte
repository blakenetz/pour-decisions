<script lang="ts">
import { onMount } from 'svelte'
import { browser } from '$app/environment'
import { goto } from '$app/navigation'
import { resolve } from '$app/paths'
import type { AuthUser } from '$lib/auth/auth'
import { getAuthUser, signOutUser } from '$lib/auth/auth'

let user: AuthUser | null = $state(null)
let loading = $state(true)

onMount(async () => {
	if (browser) {
		user = await getAuthUser()
		loading = false
	}
})

async function handleSignOut() {
	await signOutUser()
	await goto(resolve('/'))
}
</script>

<section class="flex flex-col items-center min-h-[100dvh] p-4">
	<header class="w-full max-w-4xl flex items-center justify-between py-4">
		<div class="flex items-center gap-4">
			<a href="/" class="text-sm underline hover:text-gray-600">← Home</a>
			<h1 class="text-3xl font-bold">Dashboard</h1>
		</div>
		{#if !loading && user}
			<div class="flex items-center gap-4">
				<span class="text-sm text-gray-600">{user.username}</span>
				<button onclick={handleSignOut} class="text-sm underline hover:text-gray-600">
					Sign Out
				</button>
			</div>
		{/if}
	</header>

	<main class="flex-1 flex flex-col items-center justify-center gap-8 w-full max-w-4xl">
		{#if loading}
			<p class="text-gray-500">Loading...</p>
		{:else}
			<p class="text-gray-400 text-center">Your tasting insights will appear here.</p>
		{/if}
	</main>
</section>
