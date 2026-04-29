<script lang="ts">
import { getCurrentUser } from 'aws-amplify/auth'
import { Hub } from 'aws-amplify/utils'
import { onMount } from 'svelte'
import { goto } from '$app/navigation'
import { resolve } from '$app/paths'
import { page } from '$app/state'
import { initAmplify } from '$lib/auth/amplifyClient'

let errorMsg = $state('')
let timedOut = $state(false)

onMount(() => {
	console.log('Auth callback mounted. URL:', page.url.toString())

	// Check for error params in the URL (Cognito redirects with these on failure)
	const error = page.url.searchParams.get('error')
	const errorDescription = page.url.searchParams.get('error_description')
	if (error) {
		console.error('URL error params:', { error, errorDescription })
		errorMsg = `An error occurred during sign in: ${errorDescription || error}`
		setTimeout(() => goto(resolve('/')), 3000)
		return
	}

	const provider = page.url.searchParams.get('provider')

	// GitHub uses a custom OAuth flow (not Cognito OIDC)
	if (provider === 'github') {
		handleGitHubCallback()
		return
	}

	// For other providers (Google), use Amplify's Hub events
	initAmplify()

	let resolved = false

	const unsubscribe = Hub.listen('auth', async ({ payload }) => {
		console.log('Hub auth event:', payload.event, payload)
		if (resolved) return

		if (payload.event === 'signInWithRedirect') {
			resolved = true
			unsubscribe()
			await goto(resolve('/dashboard'))
		}
		if (payload.event === 'signInWithRedirect_failure') {
			resolved = true
			unsubscribe()
			console.error('signInWithRedirect_failure payload:', JSON.stringify(payload, null, 2))
			const data = payload.data as { error?: Error } | undefined
			if (data?.error) {
				console.error('Auth failure error:', data.error)
			}
			errorMsg = data?.error?.message || 'Sign in failed. Please try again.'
			setTimeout(() => goto(resolve('/')), 3000)
		}
	})

	// Poll for auth completion in case Hub event was missed
	const pollAuth = async () => {
		for (let i = 0; i < 10; i++) {
			if (resolved) return
			try {
				await getCurrentUser()
				resolved = true
				unsubscribe()
				await goto(resolve('/dashboard'))
				return
			} catch (err) {
				console.error(`Poll attempt ${i + 1} failed:`, err)
				await new Promise((r) => setTimeout(r, 500))
			}
		}

		// After 5 seconds of polling with no auth, time out
		if (!resolved) {
			resolved = true
			unsubscribe()
			timedOut = true
			errorMsg = 'Sign in took too long. Please try again.'
		}
	}

	pollAuth()
})

async function handleGitHubCallback() {
	try {
		const { completeGitHubOAuth } = await import('$lib/auth/github')
		await completeGitHubOAuth()
		await goto(resolve('/dashboard'))
	} catch (err) {
		console.error('GitHub OAuth completion failed:', err)
		errorMsg = err instanceof Error ? err.message : 'GitHub sign in failed. Please try again.'
		timedOut = true
	}
}

function goHome() {
	goto(resolve('/'))
}
</script>

<div class="flex flex-col items-center justify-center min-h-[100dvh] p-4 gap-4">
	{#if errorMsg}
		<p class="text-red-600 text-center">{errorMsg}</p>
		{#if timedOut}
			<button onclick={goHome} class="text-sm underline hover:text-gray-600">
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
