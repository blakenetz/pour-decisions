import { redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import crypto from 'node:crypto';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ cookies }) => {
	const clientId = env.GITHUB_CLIENT_ID;
	if (!clientId) {
		throw new Error('GITHUB_CLIENT_ID is not configured');
	}

	const state = crypto.randomUUID();
	cookies.set('github_oauth_state', state, {
		httpOnly: true,
		secure: false, // set to true in production
		sameSite: 'lax',
		path: '/',
		maxAge: 300
	});

	const params = new URLSearchParams({
		client_id: clientId,
		redirect_uri: `${env.GITHUB_REDIRECT_URI || 'http://localhost:8008/api/auth/github/callback'}`,
		scope: 'user:email',
		state
	});

	redirect(302, `https://github.com/login/oauth/authorize?${params}`);
};
