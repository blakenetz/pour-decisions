import { Amplify } from 'aws-amplify'
import { browser } from '$app/environment'
import { env } from '$env/dynamic/public'

let configured = false

export function initAmplify() {
	if (!browser || configured) return

	const userPoolId = env.PUBLIC_COGNITO_USER_POOL_ID
	const userPoolClientId = env.PUBLIC_COGNITO_USER_POOL_CLIENT_ID
	const region = env.PUBLIC_AWS_REGION

	if (!userPoolId || !userPoolClientId || !region) {
		if (import.meta.env.DEV) {
			console.warn(
				'Missing required Cognito environment variables. Please set PUBLIC_COGNITO_USER_POOL_ID, PUBLIC_COGNITO_USER_POOL_CLIENT_ID, and PUBLIC_AWS_REGION in your .env file.'
			)
		}
		return
	}

	Amplify.configure({
		Auth: {
			Cognito: {
				userPoolId,
				userPoolClientId,
				...(env.PUBLIC_COGNITO_DOMAIN && {
					loginWith: {
						oauth: {
							domain: env.PUBLIC_COGNITO_DOMAIN,
							scopes: env.PUBLIC_OAUTH_SCOPES?.split(',') || ['email', 'openid', 'profile'],
							redirectSignIn: [
								env.PUBLIC_OAUTH_REDIRECT_SIGNIN || 'http://localhost:8008/auth/callback'
							],
							redirectSignOut: [env.PUBLIC_OAUTH_REDIRECT_SIGNOUT || 'http://localhost:8008/'],
							responseType: 'code' as const
						}
					}
				})
			}
		}
	})
	configured = true
}
