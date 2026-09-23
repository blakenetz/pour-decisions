<script lang="ts">
import { goto } from '$app/navigation'
import { resolve } from '$app/paths'
import { LoopLink } from '$lib'
import { signOutUser } from '$lib/auth/auth'
import type { PageData } from './$types'

let { data }: { data: PageData } = $props()

async function handleSignOut() {
	await signOutUser()
	await goto(resolve('/'))
}
</script>

<section class="flex flex-col items-center min-h-[100dvh] p-4">
	<header class="w-full max-w-2xl flex items-center justify-between py-4">
		<a href={resolve('/dashboard')} class="text-sm text-gray-500 hover:text-dark-ink">
			← Back
		</a>
		<h1 class="text-3xl font-bold">Profile</h1>
		<div class="w-12" aria-hidden="true"></div>
	</header>

	<main class="flex-1 flex flex-col gap-8 w-full max-w-2xl py-6">
		<div class="border border-gray-200 rounded-lg p-5 flex flex-col gap-4">
			<div>
				<p class="text-xs uppercase tracking-widest text-gray-500">Username</p>
				<p class="text-lg">{data.user.username}</p>
			</div>
			{#if data.user.email}
				<div>
					<p class="text-xs uppercase tracking-widest text-gray-500">Email</p>
					<p class="text-lg">{data.user.email}</p>
				</div>
			{/if}
			<div>
				<p class="text-xs uppercase tracking-widest text-gray-500">Total Pours</p>
				<p class="text-lg">{data.pourCount}</p>
			</div>
		</div>

		<div class="flex flex-col gap-3 items-start">
			<LoopLink as="a" href="/pours/new">Log a Pour</LoopLink>
			<button onclick={handleSignOut} class="text-sm underline text-gray-500 hover:text-dark-ink">
				Sign Out
			</button>
		</div>
	</main>
</section>
