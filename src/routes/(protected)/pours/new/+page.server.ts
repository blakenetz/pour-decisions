import { PutCommand } from '@aws-sdk/lib-dynamodb'
import { fail, redirect } from '@sveltejs/kit'
import { ulid } from 'ulid'
import { db, getTableName } from '$lib/server/db'
import {
	createTastingInputSchema,
	type TastingDetails,
	type TastingEntry,
	type TastingNotes
} from '$lib/types/tasting'
import type { Actions } from './$types'

function str(data: FormData, key: string): string | undefined {
	return data.get(key)?.toString().trim() || undefined
}

function num(data: FormData, key: string): number | undefined {
	return Number(data.get(key)) || undefined
}

export const actions: Actions = {
	default: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { error: 'Unauthorized' })

		const data = await request.formData()

		const details: TastingDetails = {
			producer: str(data, 'producer'),
			productName: str(data, 'productName'),
			region: str(data, 'region'),
			roastLevel: num(data, 'roastLevel'),
			roasterNotes: str(data, 'roasterNotes')
				?.split(',')
				.map((tag) => tag.trim())
				.filter(Boolean),
			brewMethod: str(data, 'brewMethod'),
			grindSize: str(data, 'grindSize'),
			coffeeGrams: num(data, 'coffeeGrams'),
			waterGrams: num(data, 'waterGrams'),
			waterTempF: num(data, 'waterTempF'),
			roastDate: str(data, 'roastDate'),
			brewDate: str(data, 'brewDate')
		}

		const notes: TastingNotes = {
			aromaIntensity: num(data, 'aromaIntensity'),
			aromaClarity: num(data, 'aromaClarity'),
			aromaNotes: str(data, 'aromaNotes'),
			flavorComplexity: num(data, 'flavorComplexity'),
			flavorSweetness: num(data, 'flavorSweetness'),
			flavorNotes: str(data, 'flavorNotes'),
			acidityIntensity: num(data, 'acidityIntensity'),
			acidityQuality: num(data, 'acidityQuality'),
			acidityNotes: str(data, 'acidityNotes'),
			bodyWeight: num(data, 'bodyWeight'),
			bodyTactile: num(data, 'bodyTactile'),
			bodyNotes: str(data, 'bodyNotes'),
			finishFlavor: num(data, 'finishFlavor'),
			finishLength: num(data, 'finishLength'),
			finishNotes: str(data, 'finishNotes'),
			freeText: str(data, 'freeText')
		}

		const hasDetails = Object.values(details).some((v) => v !== undefined)
		const hasNotes = Object.values(notes).some((v) => v !== undefined)

		const parsed = createTastingInputSchema.safeParse({
			beverageType: 'coffee',
			...(hasDetails && { details }),
			...(hasNotes && { notes })
		})
		if (!parsed.success) {
			return fail(400, { error: parsed.error.issues[0].message })
		}

		const entry: TastingEntry = {
			userId: locals.user.userId,
			entryId: ulid(),
			createdAt: new Date().toISOString(),
			...parsed.data
		}

		try {
			await db.send(new PutCommand({ TableName: getTableName(), Item: entry }))
		} catch {
			return fail(500, { error: 'Failed to save pour. Please try again.' })
		}

		redirect(303, '/')
	}
}
