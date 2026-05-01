import { CognitoJwtVerifier } from 'aws-jwt-verify'
import type { Cookies } from '@sveltejs/kit'
import { env as publicEnv } from '$env/dynamic/public'

let verifier: ReturnType<typeof CognitoJwtVerifier.create> | null = null

function getVerifier() {
	if (!verifier) {
		const userPoolId = publicEnv.PUBLIC_COGNITO_USER_POOL_ID
		const clientId = publicEnv.PUBLIC_COGNITO_USER_POOL_CLIENT_ID
		if (!userPoolId || !clientId) throw new Error('Cognito env vars not configured')

		verifier = CognitoJwtVerifier.create({
			userPoolId,
			clientId,
			tokenUse: 'access'
		})
	}
	return verifier
}

export async function verifyAccessToken(
	token: string
): Promise<{ userId: string; username: string } | null> {
	try {
		const payload = await getVerifier().verify(token)
		const username = String(payload['username'] ?? payload.sub)
		return { userId: payload.sub, username }
	} catch {
		return null
	}
}

export async function getUserFromSessionCookie(
	cookies: Cookies
): Promise<{ userId: string; username: string } | null> {
	const token = cookies.get('session')
	if (!token) return null
	return verifyAccessToken(token)
}

export async function getUserIdFromRequest(request: Request): Promise<string> {
	const authHeader = request.headers.get('Authorization')
	if (!authHeader?.startsWith('Bearer ')) {
		throw new Error('Missing or invalid Authorization header')
	}

	const token = authHeader.slice(7)
	const payload = await getVerifier().verify(token)
	return payload.sub
}
