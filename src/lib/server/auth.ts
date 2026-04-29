import { CognitoJwtVerifier } from 'aws-jwt-verify'
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

export async function getUserIdFromRequest(request: Request): Promise<string> {
	const authHeader = request.headers.get('Authorization')
	if (!authHeader?.startsWith('Bearer ')) {
		throw new Error('Missing or invalid Authorization header')
	}

	const token = authHeader.slice(7)
	const payload = await getVerifier().verify(token)
	return payload.sub
}
