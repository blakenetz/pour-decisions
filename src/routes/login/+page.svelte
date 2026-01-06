<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { initAmplify } from '$lib/auth/amplifyClient';
	import { signInUser } from '$lib/auth/auth';
	import { onDestroy } from 'svelte';

	let email = '';
	let password = '';
	let loading = false;
	let errorMsg = '';
	let isOnline = true;

	onMount(() => {
		if (browser) {
			initAmplify();
			isOnline = navigator.onLine;
			const offlineHandler = () => {
				isOnline = false;
			};
			const onlineHandler = () => {
				isOnline = true;
			};
			window.addEventListener('online', onlineHandler);
			window.addEventListener('offline', offlineHandler);
			onDestroy(() => {
				window.removeEventListener('online', onlineHandler);
				window.removeEventListener('offline', offlineHandler);
			});
		}
	});

	async function handleLogin(e: Event) {
		e.preventDefault();
		loading = true;
		errorMsg = '';
		try {
			const result = await signInUser(email, password);
			
			// Check if MFA is required
			if (result.nextStep?.signInStep === 'CONFIRM_SIGN_IN_WITH_TOTP_CODE' || 
			    result.nextStep?.signInStep === 'CONFIRM_SIGN_IN_WITH_SMS_CODE') {
				errorMsg = 'MFA is required. Please implement MFA confirmation.';
				return;
			}
			
			// Successfully signed in, redirect to home or dashboard
			// Check for redirect query parameter
			const urlParams = new URLSearchParams(window.location.search);
			const redirect = urlParams.get('redirect');
			await goto(redirect || '/');
		} catch (err: unknown) {
			const error = err as Error;
			errorMsg = error.message || 'Failed to sign in';
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>Login</title>
</svelte:head>

<div class="max-w-md mx-auto p-6">
	<h1 class="text-2xl font-semibold mb-6">Sign in</h1>

	<form on:submit|preventDefault={handleLogin} class="space-y-4">
		<div>
			<label for="email" class="block text-sm mb-1">Email</label>
			<input
				type="email"
				class="w-full border rounded px-3 py-2"
				bind:value={email}
				id="email"
				required
				disabled={loading || !isOnline}
			/>
		</div>
		<div>
			<label for="password" class="block text-sm mb-1">Password</label>
			<input
				type="password"
				class="w-full border rounded px-3 py-2"
				bind:value={password}
				id="password"
				required
				disabled={loading || !isOnline}
			/>
		</div>
		<button class="w-full bg-black text-white py-2 rounded" disabled={loading || !isOnline}>
			{#if loading}Signing in...{/if}
			{#if !loading && isOnline}Sign in{/if}
			{#if !loading && !isOnline}Go online to sign in{/if}
		</button>
	</form>

	{#if errorMsg}
		<p class="mt-4 text-red-700 text-sm">{errorMsg}</p>
	{/if}

	<div class="mt-4 text-sm text-center">
		<p>
			Don't have an account?
			<a href="/signup" class="text-blue-600 underline">Sign up</a>
		</p>
	</div>
</div>
