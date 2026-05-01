<script lang="ts">
import { goto } from '$app/navigation'
import { signOutUser } from '$lib/auth/auth'
import type { PageData } from './$types'

let { data }: { data: PageData } = $props()

async function handleSignOut() {
	await signOutUser()
	await goto('/')
}
</script>

<section class="flex flex-col items-center min-h-[100dvh] p-4">
	<header class="w-full max-w-4xl flex items-center justify-between py-4">
		<div class="flex items-center gap-4">
			<a href="/" class="text-sm underline hover:text-gray-600">← Home</a>
			<h1 class="text-3xl font-bold">Dashboard</h1>
		</div>
		<div class="flex items-center gap-4">
			<span class="text-sm text-gray-600">{data.user.username}</span>
			<button onclick={handleSignOut} class="text-sm underline hover:text-gray-600">
				Sign Out
			</button>
		</div>
	</header>

	<main class="flex-1 flex flex-col items-center justify-center gap-8 w-full max-w-4xl">
		<p class="text-gray-400 text-center">Your tasting insights will appear here.</p>
	</main>
</section>
