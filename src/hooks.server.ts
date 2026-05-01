import type { Handle } from '@sveltejs/kit'
import { getUserFromSessionCookie } from '$lib/server/auth'

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.user = await getUserFromSessionCookie(event.cookies)
	return resolve(event)
}
