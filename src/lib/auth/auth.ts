import { fetchAuthSession, getCurrentUser, signIn, signOut } from 'aws-amplify/auth'
import { browser } from '$app/environment'
import { initAmplify } from './amplifyClient'

export async function syncSession(): Promise<void> {
	if (!browser) return
	try {
		initAmplify()
		const session = await fetchAuthSession()
		const token = session.tokens?.accessToken?.toString()
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
 * Sign in with username and password
 */
export async function signInUser(username: string, password: string) {
	initAmplify()
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
