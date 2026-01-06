import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import { browser } from '$app/environment';
import { initAmplify } from '$lib/auth/amplifyClient';

export const load: PageLoad = async ({ url }) => {
	if (!browser) {
		throw redirect(302, '/');
	}

	initAmplify();

	try {
		const { fetchAuthSession } = await import('aws-amplify/auth');
		
		// Check if this is an OAuth callback
		const code = url.searchParams.get('code');
		const state = url.searchParams.get('state');
		
		if (code && state) {
			// OAuth callback - Amplify handles the token exchange automatically
			// Wait a moment for Amplify to process the callback
			await new Promise((resolve) => setTimeout(resolve, 500));
			
			// Verify the session was created
			const session = await fetchAuthSession();
			
			if (session.tokens) {
				// Successfully authenticated, redirect to home
				throw redirect(302, '/');
			}
		}
		
		// If no code/state or session not created, redirect to home
		throw redirect(302, '/');
	} catch (error) {
		// If it's a redirect, re-throw it
		if (error instanceof Error && error.message.includes('redirect')) {
			throw error;
		}
		// For other errors, redirect to home
		console.error('OAuth callback error:', error);
		throw redirect(302, '/');
	}
};
