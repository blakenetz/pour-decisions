import { fail, redirect } from '@sveltejs/kit'
import { PutCommand } from '@aws-sdk/lib-dynamodb'
import { ulid } from 'ulid'
import { db, getTableName } from '$lib/server/db'
import type { TastingDetails, TastingEntry, TastingNotes } from '$lib/types/tasting'
import type { Actions } from './$types'

export const actions: Actions = {
	default: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { error: 'Unauthorized' })

		const data = await request.formData()

		const producer = data.get('producer')?.toString().trim() || undefined
		const productName = data.get('productName')?.toString().trim() || undefined
		const brewMethod = data.get('brewMethod')?.toString().trim() || undefined
		const overallRating = Number(data.get('rating')) || undefined
		const acidity = Number(data.get('acidity')) || undefined
		const body = Number(data.get('body')) || undefined
		const freeText = data.get('freeText')?.toString().trim() || undefined

		const details: TastingDetails = { producer, productName, brewMethod }
		const notes: TastingNotes = { overallRating, acidity, body, freeText }

		const hasDetails = Object.values(details).some(Boolean)
		const hasNotes = Object.values(notes).some(Boolean)

		const entry: TastingEntry = {
			userId: locals.user.userId,
			entryId: ulid(),
			beverageType: 'coffee',
			createdAt: new Date().toISOString(),
			...(hasDetails && { details }),
			...(hasNotes && { notes })
		}

		try {
			await db.send(new PutCommand({ TableName: getTableName(), Item: entry }))
		} catch {
			return fail(500, { error: 'Failed to save tasting. Please try again.' })
		}

		redirect(303, '/')
	}
}
