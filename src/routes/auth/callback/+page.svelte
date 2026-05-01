<script lang="ts">
import { getCurrentUser } from 'aws-amplify/auth'
import { Hub } from 'aws-amplify/utils'
import { onMount } from 'svelte'
import { goto } from '$app/navigation'
import { page } from '$app/state'
import { initAmplify } from '$lib/auth/amplifyClient'
import { syncSession } from '$lib/auth/auth'

let errorMsg = $state('')
let timedOut = $state(false)

onMount(() => {
	const error = page.url.searchParams.get('error')
	const errorDescription = page.url.searchParams.get('error_description')
	if (error) {
		errorMsg = `Sign in failed: ${errorDescription || error}`
		setTimeout(() => goto('/'), 3000)
		return
	}

	if (page.url.searchParams.get('provider') === 'github') {
		handleGitHubCallback()
		return
	}

	initAmplify()

	let resolved = false

	const unsubscribe = Hub.listen('auth', async ({ payload }) => {
		if (resolved) return

		if (payload.event === 'signInWithRedirect') {
			resolved = true
			unsubscribe()
			await syncSession()
			await goto('/')
		} else if (payload.event === 'signInWithRedirect_failure') {
			resolved = true
			unsubscribe()
			const data = payload.data as { error?: Error } | undefined
			errorMsg = data?.error?.message || 'Sign in failed. Please try again.'
			setTimeout(() => goto('/'), 3000)
		}
	})

	// Check if auth already completed before the Hub listener was set up
	getCurrentUser()
		.then(async () => {
			if (resolved) return
			resolved = true
			unsubscribe()
			await syncSession()
			await goto('/')
		})
		.catch(() => {
			// Not yet authenticated — wait for Hub event
		})

	// Fallback timeout
	setTimeout(() => {
		if (!resolved) {
			resolved = true
			unsubscribe()
			timedOut = true
			errorMsg = 'Sign in took too long. Please try again.'
		}
	}, 15_000)
})

async function handleGitHubCallback() {
	try {
		const { completeGitHubOAuth } = await import('$lib/auth/github')
		await completeGitHubOAuth()
		await syncSession()
		await goto('/')
	} catch (err) {
		errorMsg = err instanceof Error ? err.message : 'GitHub sign in failed. Please try again.'
		timedOut = true
	}
}
</script>

<div class="flex flex-col items-center justify-center min-h-[100dvh] p-4 gap-4">
	{#if errorMsg}
		<p class="text-red-600 text-center">{errorMsg}</p>
		{#if timedOut}
			<button onclick={() => goto('/')} class="text-sm underline hover:text-gray-600">
				Back to home
			</button>
		{:else}
			<p class="text-sm text-gray-500">Redirecting...</p>
		{/if}
	{:else}
		<div class="flex items-center gap-2">
			<svg class="w-5 h-5 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
				<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
				<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
			</svg>
			<p class="text-gray-500">Signing you in...</p>
		</div>
	{/if}
</div>
