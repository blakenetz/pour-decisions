<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { initAmplify } from '$lib/auth/amplifyClient';
	import { signUp, confirmSignUp, resendSignUpCode, fetchAuthSession } from 'aws-amplify/auth';
	import { onDestroy, createEventDispatcher } from 'svelte';
	import Modal from './Modal.svelte';

	export let open = false;

	const dispatch = createEventDispatcher();

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

	function handleClose() {
		email = '';
		password = '';
		code = '';
		step = 'signup';
		message = '';
		errorMsg = '';
		dispatch('close');
	}

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
			message = 'Account confirmed! You can now sign in.';
			// Close modal and switch to login after a brief delay
			setTimeout(() => {
				handleClose();
				dispatch('switchToLogin');
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

	function handleSwitchToLogin() {
		handleClose();
		dispatch('switchToLogin');
	}

	async function handleSocialSignIn(provider: 'Google' | 'Facebook' | 'Apple' | 'Amazon' | 'GitHub') {
		try {
			loading = true;
			errorMsg = '';
			const { signInWithOAuth } = await import('$lib/auth/auth');
			await signInWithOAuth(provider);
			// The redirect will happen automatically
		} catch (err: unknown) {
			const error = err as Error;
			errorMsg = error.message || `Failed to sign in with ${provider}`;
			loading = false;
		}
	}
</script>

<Modal {open} title={step === 'signup' ? 'Create an account' : 'Confirm your account'} on:close={handleClose}>
	{#if step === 'signup'}
		<!-- Social Sign In Buttons -->
		<div class="space-y-3 mb-6">
			<button
				type="button"
				on:click={() => handleSocialSignIn('Google')}
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
				on:click={() => handleSocialSignIn('GitHub')}
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
				on:click={() => handleSocialSignIn('Apple')}
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

		<form on:submit|preventDefault={handleSignup} class="space-y-4">
			<div>
				<label for="signup-email" class="block text-sm mb-1">Email</label>
				<input
					type="email"
					class="w-full border rounded px-3 py-2"
					bind:value={email}
					id="signup-email"
					required
					disabled={loading || !isOnline}
					autocomplete="email"
				/>
			</div>
			<div>
				<label for="signup-password" class="block text-sm mb-1">Password</label>
				<input
					type="password"
					class="w-full border rounded px-3 py-2"
					bind:value={password}
					id="signup-password"
					required
					disabled={loading || !isOnline}
					autocomplete="new-password"
				/>
			</div>
			<button
				type="submit"
				class="w-full bg-black text-white py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed"
				disabled={loading || !isOnline}
			>
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
				<label for="signup-code" class="block text-sm mb-1">Verification code</label>
				<input
					type="text"
					class="w-full border rounded px-3 py-2"
					bind:value={code}
					id="signup-code"
					required
					disabled={loading || !isOnline}
					autocomplete="one-time-code"
				/>
			</div>
			<div class="flex gap-2">
				<button
					type="submit"
					class="flex-1 bg-black text-white py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed"
					disabled={loading || !isOnline}
				>
					{#if loading}Confirming...{/if}
					{#if !loading && isOnline}Confirm{/if}
					{#if !loading && !isOnline}Go online to confirm{/if}
				</button>
				<button
					type="button"
					class="flex-1 border py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed"
					on:click={handleResend}
					disabled={loading || !isOnline}
				>
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

	{#if step === 'signup'}
		<div class="mt-4 text-sm text-center">
			<p>
				Already have an account?
				<button type="button" on:click={handleSwitchToLogin} class="text-blue-600 underline">
					Sign in
				</button>
			</p>
		</div>
	{/if}
</Modal>
