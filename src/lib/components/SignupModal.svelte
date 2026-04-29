<script lang="ts">
import { confirmSignUp, fetchAuthSession, resendSignUpCode, signIn, signUp } from 'aws-amplify/auth'
import { onDestroy, onMount } from 'svelte'
import { z } from 'zod'
import { browser } from '$app/environment'
import { goto } from '$app/navigation'
import { resolve } from '$app/paths'
import { initAmplify } from '$lib/auth/amplifyClient'
import Modal from './Modal.svelte'

let {
	open = false,
	onclose,
	onswitchtologin
}: {
	open?: boolean
	onclose?: () => void
	onswitchtologin?: () => void
} = $props()

let email = $state('')
let password = $state('')
let confirmPassword = $state('')
let code = $state('')
let step: 'signup' | 'confirm' = $state('signup')
let loading = $state(false)
let message = $state('')
let errorMsg = $state('')
let isOnline = $state(true)
let passwordError = $state('')
let confirmPasswordError = $state('')
let passwordTouched = $state(false)
let confirmPasswordTouched = $state(false)

const passwordRules = [
	{ label: 'At least 8 characters', test: (v: string) => v.length >= 8 },
	{ label: 'At least 1 number', test: (v: string) => /[0-9]/.test(v) },
	{ label: 'At least 1 special character', test: (v: string) => /[^a-zA-Z0-9]/.test(v) },
	{ label: 'At least 1 uppercase letter', test: (v: string) => /[A-Z]/.test(v) },
	{ label: 'At least 1 lowercase letter', test: (v: string) => /[a-z]/.test(v) }
]

const passwordSchema = z
	.string()
	.min(8, 'Password must be at least 8 characters')
	.regex(/[0-9]/, 'Must contain at least 1 number')
	.regex(/[^a-zA-Z0-9]/, 'Must contain at least 1 special character')
	.regex(/[A-Z]/, 'Must contain at least 1 uppercase letter')
	.regex(/[a-z]/, 'Must contain at least 1 lowercase letter')

const getSubmitLabel = (s: typeof step) => (s === 'signup' ? 'Create account' : 'Confirm')

onMount(() => {
	if (browser) {
		initAmplify()
		isOnline = navigator.onLine
		const onlineHandler = async () => {
			isOnline = true
			try {
				await fetchAuthSession()
			} catch {
				// ignore
			}
		}
		const offlineHandler = () => {
			isOnline = false
		}
		window.addEventListener('online', onlineHandler)
		window.addEventListener('offline', offlineHandler)
		onDestroy(() => {
			window.removeEventListener('online', onlineHandler)
			window.removeEventListener('offline', offlineHandler)
		})
	}
})

function validatePassword() {
	const result = passwordSchema.safeParse(password)
	passwordError = result.success ? '' : result.error.issues[0].message
}

function validateConfirmPassword() {
	confirmPasswordError = confirmPassword !== password ? 'Passwords do not match' : ''
}

function resetPasswordError() {
	passwordError = ''
}

function resetConfirmPasswordError() {
	confirmPasswordError = ''
}

function handleClose() {
	email = ''
	password = ''
	confirmPassword = ''
	code = ''
	step = 'signup'
	message = ''
	errorMsg = ''
	passwordError = ''
	confirmPasswordError = ''
	passwordTouched = false
	confirmPasswordTouched = false
	onclose?.()
}

async function handleSignup(e: Event) {
	e.preventDefault()
	validatePassword()
	validateConfirmPassword()
	if (passwordError || confirmPasswordError) return
	loading = true
	message = ''
	errorMsg = ''
	try {
		await signUp({
			username: email,
			password,
			options: {
				userAttributes: { email }
			}
		})
		step = 'confirm'
		message = 'Verification code sent. Check your email.'
	} catch (err: unknown) {
		errorMsg = (err as Error).message ?? 'Failed to sign up'
	} finally {
		loading = false
	}
}

async function handleConfirm(e: Event) {
	e.preventDefault()
	loading = true
	message = ''
	errorMsg = ''
	try {
		await confirmSignUp({ username: email, confirmationCode: code })
		await signIn({ username: email, password })
		handleClose()
		await goto(resolve('/dashboard'))
	} catch (err: unknown) {
		errorMsg = (err as Error).message ?? 'Failed to confirm sign up'
	} finally {
		loading = false
	}
}

async function handleResend() {
	loading = true
	message = ''
	errorMsg = ''
	try {
		await resendSignUpCode({ username: email })
		message = 'Verification code resent.'
	} catch (err: unknown) {
		errorMsg = (err as Error).message ?? 'Failed to resend code'
	} finally {
		loading = false
	}
}

function handleSwitchToLogin() {
	handleClose()
	onswitchtologin?.()
}

async function handleSocialSignIn(provider: 'Google' | 'GitHub') {
	try {
		loading = true
		errorMsg = ''
		if (provider === 'GitHub') {
			const { startGitHubOAuth } = await import('$lib/auth/github')
			startGitHubOAuth()
			return
		}
		const { signInWithOAuth } = await import('$lib/auth/auth')
		await signInWithOAuth(provider)
	} catch (err: unknown) {
		const error = err as Error
		errorMsg = error.message || `Failed to sign in with ${provider}`
		loading = false
	}
}
</script>

<Modal
	{open}
	title={step === 'signup' ? 'Create an account' : 'Confirm your account'}
	onclose={handleClose}
>
	{#if step === 'signup'}
		<div class="space-y-3 mb-6">
			<button
				type="button"
				onclick={() => handleSocialSignIn('Google')}
				class="w-full flex items-center justify-center gap-3 border border-gray-300 rounded-lg py-2.5 px-4 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
				disabled={loading || !isOnline}
			>
				<svg class="w-5 h-5" viewBox="0 0 24 24">
					<path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
					<path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
					<path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
					<path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
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
					<path fill-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482C19.138 20.197 22 16.425 22 12.017 22 6.484 17.522 2 12 2z" clip-rule="evenodd" />
				</svg>
				<span class="text-sm font-medium">Continue with GitHub</span>
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

		<form onsubmit={handleSignup} class="space-y-4">
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
					class="w-full border rounded px-3 py-2 {passwordError ? 'border-red-500' : ''}"
					bind:value={password}
					id="signup-password"
					required
					disabled={loading || !isOnline}
					autocomplete="new-password"
					onblur={() => { passwordTouched = true; validatePassword(); }}
					onfocus={resetPasswordError}
				/>
				<ul class="mt-2 space-y-1">
						{#each passwordRules as rule (rule.label)}
							{@const passing = rule.test(password)}
							<li class="flex items-center gap-1.5 text-xs {passwordTouched ? (passing ? 'text-green-600' : 'text-red-500') : 'text-gray-500'}">
								{#if passwordTouched && passing}
									<svg class="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
										<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
									</svg>
								{:else if passwordTouched && !passing}
									<svg class="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
										<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
									</svg>
								{:else}
									<svg class="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
										<circle cx="12" cy="12" r="4" />
									</svg>
								{/if}
								{rule.label}
							</li>
						{/each}
					</ul>
			</div>
			<div>
				<label for="signup-confirm-password" class="block text-sm mb-1">Confirm password</label>
				<input
					type="password"
					class="w-full border rounded px-3 py-2 {confirmPasswordError ? 'border-red-500' : ''}"
					bind:value={confirmPassword}
					id="signup-confirm-password"
					required
					disabled={loading || !isOnline}
					autocomplete="new-password"
					onblur={() => { confirmPasswordTouched = true; validateConfirmPassword(); }}
					onfocus={resetConfirmPasswordError}
				/>
				{#if confirmPasswordTouched && confirmPasswordError}
					<p class="mt-1 text-xs text-red-600">{confirmPasswordError}</p>
				{/if}
			</div>
			<button
				type="submit"
				class="w-full bg-black text-white py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed"
				disabled={loading || !isOnline}
			>
				{#if loading}{getSubmitLabel(step)}...{/if}
				{#if !loading && isOnline}{getSubmitLabel(step)}{/if}
				{#if !loading && !isOnline}Go online to create account{/if}
			</button>
		</form>
	{/if}

	{#if step === 'confirm'}
		<form onsubmit={handleConfirm} class="space-y-4">
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
					onclick={handleResend}
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
				<button type="button" onclick={handleSwitchToLogin} class="text-blue-600 underline">
					Sign in
				</button>
			</p>
		</div>
	{/if}
</Modal>
