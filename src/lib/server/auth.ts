import type { Cookies } from '@sveltejs/kit'
import { CognitoJwtVerifier } from 'aws-jwt-verify'
import type { CognitoJwtVerifierSingleUserPool } from 'aws-jwt-verify/cognito-verifier'
import { env as publicEnv } from '$env/dynamic/public'

export interface SessionUser {
	userId: string
	username: string
	email?: string
}

type AccessTokenVerifier = CognitoJwtVerifierSingleUserPool<{
	userPoolId: string
	clientId: string
	tokenUse: 'access'
}>
type IdTokenVerifier = CognitoJwtVerifierSingleUserPool<{
	userPoolId: string
	clientId: string
	tokenUse: 'id'
}>

let accessTokenVerifier: AccessTokenVerifier | null = null
let idTokenVerifier: IdTokenVerifier | null = null

function getAccessTokenVerifier() {
	if (!accessTokenVerifier) {
		const userPoolId = publicEnv.PUBLIC_COGNITO_USER_POOL_ID
		const clientId = publicEnv.PUBLIC_COGNITO_USER_POOL_CLIENT_ID
		if (!userPoolId || !clientId) throw new Error('Cognito env vars not configured')

		accessTokenVerifier = CognitoJwtVerifier.create({
			userPoolId,
			clientId,
			tokenUse: 'access'
		})
	}
	return accessTokenVerifier
}

function getIdTokenVerifier() {
	if (!idTokenVerifier) {
		const userPoolId = publicEnv.PUBLIC_COGNITO_USER_POOL_ID
		const clientId = publicEnv.PUBLIC_COGNITO_USER_POOL_CLIENT_ID
		if (!userPoolId || !clientId) throw new Error('Cognito env vars not configured')

		idTokenVerifier = CognitoJwtVerifier.create({
			userPoolId,
			clientId,
			tokenUse: 'id'
		})
	}
	return idTokenVerifier
}

/**
 * Verify the session cookie's ID token and resolve a display-friendly user.
 *
 * Federated sign-ins (Google, GitHub-as-OIDC) get a Cognito-generated
 * `username` like "google_1046…" — that claim only lives on the *access*
 * token. The ID token carries the actual mapped `email`/`name` attributes,
 * so it's the source of truth for what to show the user.
 */
export async function verifySessionToken(token: string): Promise<SessionUser | null> {
	try {
		const payload = await getIdTokenVerifier().verify(token)
		const email = typeof payload['email'] === 'string' ? payload['email'] : undefined
		const name = typeof payload['name'] === 'string' ? payload['name'] : undefined
		const username = email ?? name ?? String(payload['cognito:username'] ?? payload.sub)
		return { userId: payload.sub, username, email }
	} catch {
		return null
	}
}

export async function getUserFromSessionCookie(cookies: Cookies): Promise<SessionUser | null> {
	const token = cookies.get('session')
	if (!token) return null
	return verifySessionToken(token)
}

export async function getUserIdFromRequest(request: Request): Promise<string> {
	const authHeader = request.headers.get('Authorization')
	if (!authHeader?.startsWith('Bearer ')) {
		throw new Error('Missing or invalid Authorization header')
	}

	const token = authHeader.slice(7)
	const payload = await getAccessTokenVerifier().verify(token)
	return payload.sub
}
