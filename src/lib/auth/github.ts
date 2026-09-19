import { signIn } from 'aws-amplify/auth'
import { initAmplify } from './amplifyClient'
import { clearStaleSession } from './auth'

export function startGitHubOAuth() {
	window.location.href = '/api/auth/github'
}

export async function completeGitHubOAuth() {
	const res = await fetch('/api/auth/github/session', { method: 'POST' })
	if (!res.ok) {
		const text = await res.text()
		throw new Error(text || 'Failed to retrieve GitHub credentials')
	}

	const { email, password } = await res.json()

	initAmplify()
	await clearStaleSession()
	await signIn({ username: email, password })
}
