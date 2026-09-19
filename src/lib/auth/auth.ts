import { fetchAuthSession, getCurrentUser, signIn, signOut } from 'aws-amplify/auth'
import { browser } from '$app/environment'
import { initAmplify } from './amplifyClient'

export async function syncSession(): Promise<void> {
	if (!browser) return
	try {
		initAmplify()
		const session = await fetchAuthSession()
		// The ID token (not access token) carries the mapped email/name
		// claims for federated sign-ins — the session cookie needs those
		// for display, not just the Cognito-generated federated username.
		const token = session.tokens?.idToken?.toString()
		if (!token) return
		await fetch('/api/auth/session', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ token })
		})
	} catch {
		// best-effort — client-side auth still works without the cookie
	}
}

export interface AuthUser {
	username: string
	userId: string
	signInDetails?: {
		loginId?: string
		authFlowType?: string
	}
}

/**
 * Get the current authenticated user
 */
export async function getAuthUser(): Promise<AuthUser | null> {
	if (!browser) return null

	try {
		initAmplify()
		const user = await getCurrentUser()
		return user
	} catch {
		// User is not authenticated
		return null
	}
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
	const user = await getAuthUser()
	return user !== null
}

/**
 * Get the current auth session (includes tokens)
 */
export async function getAuthSession() {
	if (!browser) return null

	try {
		initAmplify()
		const session = await fetchAuthSession()
		return session
	} catch {
		return null
	}
}

/**
 * Amplify refuses to start a new sign-in flow (password or OAuth) while it
 * believes a user is already signed in, throwing "There is already a
 * signed in user." — even if that local session is stale (e.g. an
 * interrupted OAuth redirect, or tokens left over from a previous device
 * session). Clear it proactively so a fresh sign-in attempt always works.
 */
export async function clearStaleSession(): Promise<void> {
	try {
		await getCurrentUser()
	} catch {
		return // no local session — nothing to clear
	}

	try {
		await signOut()
	} catch {
		// best-effort — proceed with sign-in regardless
	}
}

/**
 * Sign in with username and password
 */
export async function signInUser(username: string, password: string) {
	initAmplify()
	await clearStaleSession()
	return await signIn({ username, password })
}

/**
 * Sign out the current user
 */
export async function signOutUser() {
	if (!browser) return

	try {
		initAmplify()
		await signOut()
		await fetch('/api/auth/session', { method: 'DELETE' })
	} catch (error) {
		console.error('Error signing out:', error)
		throw error
	}
}

/**
 * Sign in with OAuth provider (Google, GitHub, Apple, etc.)
 */
export async function signInWithOAuth(provider: 'Google' | 'GitHub') {
	if (!browser) {
		throw new Error('OAuth sign-in is only available in the browser')
	}

	try {
		initAmplify()
		await clearStaleSession()
		const { signInWithRedirect } = await import('aws-amplify/auth')

		// Google is a built-in Amplify provider; GitHub is an OIDC provider
		// in Cognito, so it needs the "custom" provider syntax.
		const providerConfig =
			provider === 'GitHub'
				? { provider: { custom: 'GitHub' } }
				: { provider: provider as 'Google' }

		await signInWithRedirect({
			...providerConfig,
			options: {
				preferPrivateSession: false
			}
		})
	} catch (error) {
		console.error(`Error signing in with ${provider}:`, error)
		throw error
	}
}
