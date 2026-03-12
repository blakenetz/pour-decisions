<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import { initAmplify } from '$lib/auth/amplifyClient';
	import { signInUser, signInWithOAuth } from '$lib/auth/auth';
	import Modal from './Modal.svelte';

	let { open = false, onclose, onsuccess, onswitchtosignup }: {
		open?: boolean;
		onclose?: () => void;
		onsuccess?: () => void;
		onswitchtosignup?: () => void;
	} = $props();

	let email = $state('');
	let password = $state('');
	let loading = $state(false);
	let errorMsg = $state('');
	let isOnline = $state(true);

	const submitLabel = 'Sign in';

	onMount(() => {
		if (browser) {
			initAmplify();
			isOnline = navigator.onLine;

			const offlineHandler = () => isOnline = false;
			const onlineHandler = () => isOnline = true;

			window.addEventListener('online', onlineHandler);
			window.addEventListener('offline', offlineHandler);
			onDestroy(() => {
				window.removeEventListener('online', onlineHandler);
				window.removeEventListener('offline', offlineHandler);
			});
		}
	});

	function handleClose() {
		email = '';
		password = '';
		errorMsg = '';
		onclose?.();
	}

	async function handleLogin(e: Event) {
		e.preventDefault();
		loading = true;
		errorMsg = '';
		try {
			const result = await signInUser(email, password);

			// Check if MFA is required
			if (
				result.nextStep?.signInStep === 'CONFIRM_SIGN_IN_WITH_TOTP_CODE' ||
				result.nextStep?.signInStep === 'CONFIRM_SIGN_IN_WITH_SMS_CODE'
			) {
				errorMsg = 'MFA is required. Please implement MFA confirmation.';
				return;
			}

			// Successfully signed in
			onsuccess?.();
			handleClose();
		} catch (err: unknown) {
			const error = err as Error;
			errorMsg = error.message || 'Failed to sign in';
		} finally {
			loading = false;
		}
	}

	function handleSwitchToSignup() {
		handleClose();
		onswitchtosignup?.();
	}

	async function handleSocialSignIn(provider: 'Google' | 'Facebook' | 'Apple' | 'Amazon' | 'GitHub') {
		try {
			await signInWithOAuth(provider);
			// The redirect will happen automatically
		} catch (err: unknown) {
			const error = err as Error;
			errorMsg = error.message || `Failed to sign in with ${provider}`;
		}
	}
</script>

<Modal {open} title="Sign in" onclose={handleClose}>
	<!-- Social Sign In Buttons -->
	<div class="space-y-3 mb-6">
		<button
			type="button"
			onclick={() => handleSocialSignIn('Google')}
			class="w-full flex items-center justify-center gap-3 border border-gray-300 rounded-lg py-2.5 px-4 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
			disabled={loading || !isOnline}
		>
			<svg class="w-5 h-5" viewBox="0 0 24 24">
				<path
					fill="#4285F4"
					d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
				/>
				<path
					fill="#34A853"
					d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
				/>
				<path
					fill="#FBBC05"
					d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
				/>
				<path
					fill="#EA4335"
					d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
				/>
			</svg>
			<span class="text-sm font-medium">Continue with Google</span>
		</button>

		<button
			type="button"
			onclick={() => handleSocialSignIn('GitHub')}
			class="w-full flex items-center justify-center gap-3 border border-gray-300 rounded-lg py-2.5 px-4 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
			disabled={loading || !isOnline}
		>
			<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
				<path
					fill-rule="evenodd"
					d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482C19.138 20.197 22 16.425 22 12.017 22 6.484 17.522 2 12 2z"
					clip-rule="evenodd"
				/>
			</svg>
			<span class="text-sm font-medium">Continue with GitHub</span>
		</button>

		<button
			type="button"
			onclick={() => handleSocialSignIn('Apple')}
			class="w-full flex items-center justify-center gap-3 border border-gray-300 rounded-lg py-2.5 px-4 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
			disabled={loading || !isOnline}
		>
			<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
				<path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
			</svg>
			<span class="text-sm font-medium">Continue with Apple</span>
		</button>
	</div>

	<div class="relative mb-6">
		<div class="absolute inset-0 flex items-center">
			<div class="w-full border-t border-gray-300"></div>
		</div>
		<div class="relative flex justify-center text-sm">
			<span class="px-2 bg-white text-gray-500">Or continue with email</span>
		</div>
	</div>

	<form onsubmit={handleLogin} class="space-y-4">
		<div>
			<label for="login-email" class="block text-sm mb-1">Email</label>
			<input
				type="email"
				class="w-full border rounded px-3 py-2"
				bind:value={email}
				id="login-email"
				required
				disabled={loading || !isOnline}
				autocomplete="email"
			/>
		</div>
		<div>
			<label for="login-password" class="block text-sm mb-1">Password</label>
			<input
				type="password"
				class="w-full border rounded px-3 py-2"
				bind:value={password}
				id="login-password"
				required
				disabled={loading || !isOnline}
				autocomplete="current-password"
			/>
		</div>
		<button
			type="submit"
			class="w-full bg-black text-white py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed"
			disabled={loading || !isOnline}
		>
			{#if loading}{submitLabel}...{/if}
			{#if !loading && isOnline}{submitLabel}{/if}
			{#if !loading && !isOnline}Go online to sign in{/if}
		</button>
	</form>

	{#if errorMsg}
		<p class="mt-4 text-red-700 text-sm">{errorMsg}</p>
	{/if}

	<div class="mt-4 text-sm text-center">
		<p>
			Don't have an account?
			<button type="button" onclick={handleSwitchToSignup} class="text-blue-600 underline">
				Sign up
			</button>
		</p>
	</div>
</Modal>
