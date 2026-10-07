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
							// Derived from the current origin so every environment (localhost, dev, prod)
							// works without per-deploy config; each origin must still be registered as a
							// callback/logout URL on the Cognito app client (infra/lib/pour-decisions-stack.ts).
							redirectSignIn: [`${window.location.origin}/auth/callback`],
							redirectSignOut: [`${window.location.origin}/`],
							responseType: 'code' as const
						}
					}
				})
			}
		}
	})
	configured = true
}
