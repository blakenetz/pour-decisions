import { redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import crypto from 'node:crypto';
import {
	CognitoIdentityProviderClient,
	AdminGetUserCommand,
	AdminCreateUserCommand,
	AdminSetUserPasswordCommand
} from '@aws-sdk/client-cognito-identity-provider';
import type { RequestHandler } from './$types';

function generatePassword(githubUserId: string): string {
	const secret = env.GITHUB_CLIENT_SECRET;
	if (!secret) throw new Error('GITHUB_CLIENT_SECRET is not configured');
	const hmac = crypto.createHmac('sha256', secret).update(String(githubUserId)).digest('base64');
	// Append chars to guarantee Cognito password policy compliance
	return hmac.slice(0, 28) + '!Aa1';
}

function encrypt(data: string): string {
	const secret = env.GITHUB_CLIENT_SECRET;
	if (!secret) throw new Error('GITHUB_CLIENT_SECRET is not configured');
	const key = crypto.createHash('sha256').update(secret).digest();
	const iv = crypto.randomBytes(12);
	const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
	const encrypted = Buffer.concat([cipher.update(data, 'utf8'), cipher.final()]);
	const tag = cipher.getAuthTag();
	return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

export const GET: RequestHandler = async ({ url, cookies }) => {
	const code = url.searchParams.get('code');
	const state = url.searchParams.get('state');
	const storedState = cookies.get('github_oauth_state');

	cookies.delete('github_oauth_state', { path: '/' });

	if (!code || !state || state !== storedState) {
		redirect(302, '/?error=invalid_state');
	}

	const clientId = env.GITHUB_CLIENT_ID;
	const clientSecret = env.GITHUB_CLIENT_SECRET;
	if (!clientId || !clientSecret) {
		throw new Error('GitHub OAuth credentials not configured');
	}

	// Exchange code for access token
	const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Accept: 'application/json'
		},
		body: JSON.stringify({
			client_id: clientId,
			client_secret: clientSecret,
			code
		})
	});

	const tokenData = await tokenRes.json();
	if (tokenData.error) {
		redirect(302, `/?error=${encodeURIComponent(tokenData.error_description || tokenData.error)}`);
	}

	const accessToken = tokenData.access_token;

	// Fetch GitHub user info
	const [userRes, emailsRes] = await Promise.all([
		fetch('https://api.github.com/user', {
			headers: { Authorization: `Bearer ${accessToken}`, 'User-Agent': 'pour-decisions' }
		}),
		fetch('https://api.github.com/user/emails', {
			headers: { Authorization: `Bearer ${accessToken}`, 'User-Agent': 'pour-decisions' }
		})
	]);

	const userData = await userRes.json();
	const emailsData = await emailsRes.json();

	// Find primary verified email
	const primaryEmail = emailsData.find(
		(e: { primary: boolean; verified: boolean; email: string }) => e.primary && e.verified
	);
	if (!primaryEmail) {
		redirect(302, '/?error=no_verified_email');
	}

	const email = primaryEmail.email;
	const githubUserId = String(userData.id);
	const password = generatePassword(githubUserId);

	// Set up Cognito client
	const region = publicEnv.PUBLIC_AWS_REGION || 'us-west-1';
	const userPoolId = publicEnv.PUBLIC_COGNITO_USER_POOL_ID;
	if (!userPoolId) throw new Error('PUBLIC_COGNITO_USER_POOL_ID not configured');

	const cognito = new CognitoIdentityProviderClient({ region });

	// Check if user exists
	let userExists = false;
	try {
		await cognito.send(
			new AdminGetUserCommand({ UserPoolId: userPoolId, Username: email })
		);
		userExists = true;
	} catch (err: unknown) {
		if ((err as { name?: string }).name !== 'UserNotFoundException') {
			throw err;
		}
	}

	if (!userExists) {
		// Create the user
		await cognito.send(
			new AdminCreateUserCommand({
				UserPoolId: userPoolId,
				Username: email,
				UserAttributes: [
					{ Name: 'email', Value: email },
					{ Name: 'email_verified', Value: 'true' }
				],
				MessageAction: 'SUPPRESS'
			})
		);
	}

	// Set the deterministic password (works for both new and existing GitHub users)
	await cognito.send(
		new AdminSetUserPasswordCommand({
			UserPoolId: userPoolId,
			Username: email,
			Password: password,
			Permanent: true
		})
	);

	// Encrypt credentials and set as cookie
	const encrypted = encrypt(JSON.stringify({ email, password }));
	cookies.set('github_credentials', encrypted, {
		httpOnly: true,
		secure: false, // set to true in production
		sameSite: 'lax',
		path: '/api/auth/github',
		maxAge: 60
	});

	redirect(302, '/auth/callback?provider=github');
};
