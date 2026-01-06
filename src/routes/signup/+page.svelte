<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { initAmplify } from '$lib/auth/amplifyClient';
	import { signUp, confirmSignUp, resendSignUpCode, fetchAuthSession } from 'aws-amplify/auth';
	import { onDestroy } from 'svelte';

	let email = '';
	let password = '';
	let code = '';
	let step: 'signup' | 'confirm' = 'signup';
	let loading = false;
	let message = '';
	let errorMsg = '';
	let isOnline = true;

	onMount(() => {
		if (browser) {
			initAmplify();
			isOnline = navigator.onLine;
			const onlineHandler = async () => {
				isOnline = true;
				try {
					await fetchAuthSession();
				} catch (_) {
					// ignore; user may be signed out or needs reauth
				}
			};
			const offlineHandler = () => {
				isOnline = false;
			};
			window.addEventListener('online', onlineHandler);
			window.addEventListener('offline', offlineHandler);
			onDestroy(() => {
				window.removeEventListener('online', onlineHandler);
				window.removeEventListener('offline', offlineHandler);
			});
		}
	});

	async function handleSignup(e: Event) {
		e.preventDefault();
		loading = true;
		message = '';
		errorMsg = '';
		try {
			await signUp({
				username: email,
				password,
				options: {
					userAttributes: { email }
				}
			});
			step = 'confirm';
			message = 'Verification code sent. Check your email.';
		} catch (err: unknown) {
			errorMsg = (err as Error).message ?? 'Failed to sign up';
		} finally {
			loading = false;
		}
	}

	async function handleConfirm(e: Event) {
		e.preventDefault();
		loading = true;
		message = '';
		errorMsg = '';
		try {
			await confirmSignUp({ username: email, confirmationCode: code });
			message = 'Account confirmed! Redirecting to login...';
			// Redirect to login after a brief delay
			setTimeout(() => {
				goto('/login');
			}, 1500);
		} catch (err: unknown) {
			errorMsg = (err as Error).message ?? 'Failed to confirm sign up';
		} finally {
			loading = false;
		}
	}

	async function handleResend() {
		loading = true;
		message = '';
		errorMsg = '';
		try {
			await resendSignUpCode({ username: email });
			message = 'Verification code resent.';
		} catch (err: unknown) {
			errorMsg = (err as Error).message ?? 'Failed to resend code';
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>Sign up</title>
</svelte:head>

<div class="max-w-md mx-auto p-6">
	<h1 class="text-2xl font-semibold mb-6">Create an account</h1>

	{#if step === 'signup'}
		<form on:submit|preventDefault={handleSignup} class="space-y-4">
			<div>
				<label for="email" class="block text-sm mb-1">Email</label>
				<input
					type="email"
					class="w-full border rounded px-3 py-2"
					bind:value={email}
					id="email"
					required
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
				/>
			</div>
			<button class="w-full bg-black text-white py-2 rounded" disabled={loading || !isOnline}>
				{#if loading}Creating...{/if}
				{#if !loading && isOnline}Create account{/if}
				{#if !loading && !isOnline}Go online to create account{/if}
			</button>
		</form>
	{/if}

	{#if step === 'confirm'}
		<form on:submit|preventDefault={handleConfirm} class="space-y-4">
			<p class="text-sm text-gray-600">We sent a verification code to {email}.</p>
			<div>
				<label for="code" class="block text-sm mb-1">Verification code</label>
				<input
					type="text"
					class="w-full border rounded px-3 py-2"
					bind:value={code}
					id="code"
					required
				/>
			</div>
			<div class="flex gap-2">
				<button class="flex-1 bg-black text-white py-2 rounded" disabled={loading || !isOnline}>
					{#if loading}Confirming...{/if}
					{#if !loading && isOnline}Confirm{/if}
					{#if !loading && !isOnline}Go online to confirm{/if}
				</button>
				<button type="button" class="flex-1 border py-2 rounded" on:click={handleResend} disabled={loading || !isOnline}>
					Resend code
				</button>
			</div>
		</form>
	{/if}

	{#if message}
		<p class="mt-4 text-green-700 text-sm">{message}</p>
	{/if}
	{#if errorMsg}
		<p class="mt-4 text-red-700 text-sm">{errorMsg}</p>
	{/if}
</div>
