import { PutCommand } from '@aws-sdk/lib-dynamodb'
import { fail, redirect } from '@sveltejs/kit'
import { ulid } from 'ulid'
import { db, getTableName } from '$lib/server/db'
import { formNumber as num, formString as str } from '$lib/server/form-data'
import { getPourDefaults } from '$lib/server/settings'
import { parseNotes } from '$lib/types/coffee'
import {
	computeIntensityScore,
	computeQualityScore,
	createTastingInputSchema,
	type TastingDetails,
	type TastingEntry,
	type TastingNotes
} from '$lib/types/tasting'
import type { Actions, PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ locals }) => {
	// Loads run in parallel with the (protected) layout's redirect, so guard here too.
	if (!locals.user) redirect(302, '/')
	return { defaults: await getPourDefaults(locals.user.userId) }
}

export const actions: Actions = {
	default: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { error: 'Unauthorized' })

		const data = await request.formData()

		const details: TastingDetails = {
			roaster: str(data, 'roaster'),
			productName: str(data, 'productName'),
			country: str(data, 'country'),
			region: str(data, 'region'),
			process: str(data, 'process'),
			roastLevel: num(data, 'roastLevel'),
			roasterNotes: parseNotes(str(data, 'roasterNotes')),
			brewMethod: str(data, 'brewMethod'),
			grindSize: str(data, 'grindSize'),
			grinder: str(data, 'grinder'),
			grindSetting: str(data, 'grindSetting'),
			coffeeGrams: num(data, 'coffeeGrams'),
			waterGrams: num(data, 'waterGrams'),
			waterTempF: num(data, 'waterTempF'),
			brewTimeSeconds: num(data, 'brewTimeSeconds'),
			roastDate: str(data, 'roastDate'),
			brewDate: str(data, 'brewDate'),
			location: str(data, 'location') as TastingDetails['location'],
			locationName: str(data, 'locationName'),
			locationAddress: str(data, 'locationAddress'),
			locationLat: num(data, 'locationLat'),
			locationLng: num(data, 'locationLng')
		}

		const buyAgain = str(data, 'wouldBuyAgain')

		const notes: TastingNotes = {
			overallRating: num(data, 'overallRating'),
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
			tasterNotes: parseNotes(str(data, 'tasterNotes')),
			wouldBuyAgain: buyAgain === undefined ? undefined : buyAgain === 'yes',
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

		const qualityScore = computeQualityScore(parsed.data.notes)
		const intensityScore = computeIntensityScore(parsed.data.notes)

		const entry: TastingEntry = {
			userId: locals.user.userId,
			entryId: ulid(),
			createdAt: new Date().toISOString(),
			...parsed.data,
			...(qualityScore !== undefined && { qualityScore }),
			...(intensityScore !== undefined && { intensityScore })
		}

		try {
			await db.send(new PutCommand({ TableName: getTableName(), Item: entry }))
		} catch (err) {
			console.error('Failed to save pour:', err)
			return fail(500, { error: 'Failed to save pour. Please try again.' })
		}

		redirect(303, '/')
	}
}
