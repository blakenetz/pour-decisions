<script lang="ts">
import { onMount } from 'svelte'
import { browser } from '$app/environment'
import { goto } from '$app/navigation'
import { resolve } from '$app/paths'
import type { AuthUser } from '$lib/auth/auth'
import { getAuthUser, signOutUser } from '$lib/auth/auth'
import OvalButton from '$lib/components/actions/OvalButton.svelte'

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
	<header class="w-full max-w-2xl flex items-center justify-between py-4">
		<h1 class="text-3xl font-bold">Pour Decisions</h1>
		{#if !loading && user}
			<div class="flex items-center gap-4">
				<span class="text-sm text-gray-600">{user.username}</span>
				<button onclick={handleSignOut} class="text-sm underline hover:text-gray-600">
					Sign Out
				</button>
			</div>
		{/if}
	</header>

	<main class="flex-1 flex flex-col items-center justify-center gap-12 w-full max-w-2xl">
		{#if loading}
			<p class="text-gray-500">Loading...</p>
		{:else}
			<p class="text-xl text-center">What would you like to do?</p>
			<div class="flex flex-wrap items-center justify-center gap-16">
				<OvalButton as="a" href="/tastings/new">Log a Tasting</OvalButton>
				<OvalButton as="a" href="/dashboard/trends">View My Dashboard</OvalButton>
			</div>
		{/if}
	</main>
</section>
