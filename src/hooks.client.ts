import { initAmplify } from '$lib/auth/amplifyClient';
import { env } from '$env/dynamic/public';

// Initialize Amplify on the client side only if environment variables are set
// This prevents errors during development when env vars might not be configured yet
if (
	env.PUBLIC_COGNITO_USER_POOL_ID &&
	env.PUBLIC_COGNITO_USER_POOL_CLIENT_ID &&
	env.PUBLIC_AWS_REGION
) {
	initAmplify();
}
