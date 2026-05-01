import { dev } from '$app/environment'
import { error, json } from '@sveltejs/kit'
import { verifyAccessToken } from '$lib/server/auth'
import type { RequestHandler } from './$types'

const COOKIE_OPTIONS = {
	httpOnly: true,
	sameSite: 'lax' as const,
	secure: !dev,
	path: '/',
	maxAge: 60 * 60 // 1 hour — matches Cognito access token default expiry
}

export const POST: RequestHandler = async ({ request, cookies }) => {
	let token: string
	try {
		const body = await request.json()
		token = body.token
	} catch {
		error(400, 'Invalid request body')
	}

	if (!token) error(400, 'Missing token')

	const user = await verifyAccessToken(token)
	if (!user) error(401, 'Invalid token')

	cookies.set('session', token, COOKIE_OPTIONS)
	return json({ ok: true })
}

export const DELETE: RequestHandler = async ({ cookies }) => {
	cookies.delete('session', { path: '/' })
	return new Response(null, { status: 204 })
}
