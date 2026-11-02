import { PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb'
import { fail, redirect } from '@sveltejs/kit'
import { ulid } from 'ulid'
import {
	lastPour,
	type PastPourSource,
	pastBeerTags,
	pastCustomStyles,
	pastNotes,
	pastProducts,
	pastVenues
} from '$lib/past-pours'
import { db, getTableName } from '$lib/server/db'
import { formNumber as num, formString as str } from '$lib/server/form-data'
import { getPourDefaults } from '$lib/server/settings'
import { parseNotes } from '$lib/types/coffee'
import {
	type BeerDetails,
	type BeerNotes,
	type CoffeeDetails,
	type CoffeeNotes,
	computeIntensityScore,
	computeQualityScore,
	createTastingInputSchema,
	type PourLocationFields,
	type TastingEntry
} from '$lib/types/tasting'
import type { Actions, PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ locals }) => {
	// Loads run in parallel with the (protected) layout's redirect, so guard here too.
	if (!locals.user) redirect(302, '/')
	const [defaults, history] = await Promise.all([
		getPourDefaults(locals.user.userId),
		db.send(
			new QueryCommand({
				TableName: getTableName(),
				KeyConditionExpression: 'userId = :userId',
				ExpressionAttributeValues: { ':userId': locals.user.userId },
				// Only what the autofills and note suggestions read: no ids or computed scores.
				ProjectionExpression: '#beverageType, #details, #notes, #createdAt',
				ExpressionAttributeNames: {
					'#beverageType': 'beverageType',
					'#details': 'details',
					'#notes': 'notes',
					'#createdAt': 'createdAt'
				}
			})
		)
	])
	const entries = (history.Items ?? []) as PastPourSource[]
	return {
		defaults,
		defaultBeverage: lastPour(entries)?.beverageType ?? 'coffee',
		pastProducts: { coffee: pastProducts(entries, 'coffee'), beer: pastProducts(entries, 'beer') },
		pastNotes: { coffee: pastNotes(entries, 'coffee'), beer: pastNotes(entries, 'beer') },
		lastPours: { coffee: lastPour(entries, 'coffee'), beer: lastPour(entries, 'beer') },
		pastVenues: pastVenues(entries),
		pastHops: pastBeerTags(entries, 'hops'),
		pastIngredients: pastBeerTags(entries, 'ingredients'),
		customStyles: pastCustomStyles(entries)
	}
}

function readLocation(data: FormData): PourLocationFields {
	return {
		location: str(data, 'location') as PourLocationFields['location'],
		locationName: str(data, 'locationName'),
		locationAddress: str(data, 'locationAddress'),
		locationLat: num(data, 'locationLat'),
		locationLng: num(data, 'locationLng')
	}
}

function readBuyAgain(data: FormData): boolean | undefined {
	const buyAgain = str(data, 'wouldBuyAgain')
	return buyAgain === undefined ? undefined : buyAgain === 'yes'
}

function readCoffee(data: FormData): { details: CoffeeDetails; notes: CoffeeNotes } {
	const details: CoffeeDetails = {
		roaster: str(data, 'roaster'),
		productName: str(data, 'productName'),
		country: str(data, 'country'),
		region: str(data, 'region'),
		process: str(data, 'process'),
		roastLevel: num(data, 'roastLevel'),
		roasterNotes: parseNotes(str(data, 'roasterNotes')),
		drinkStyle: str(data, 'drinkStyle'),
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
		...readLocation(data)
	}

	const notes: CoffeeNotes = {
		overallRating: num(data, 'overallRating'),
		fragranceIntensity: num(data, 'fragranceIntensity'),
		fragranceNotes: str(data, 'fragranceNotes'),
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
		wouldBuyAgain: readBuyAgain(data),
		freeText: str(data, 'freeText')
	}

	return { details, notes }
}

function readBeer(data: FormData): { details: BeerDetails; notes: BeerNotes } {
	const details: BeerDetails = {
		brewery: str(data, 'brewery'),
		productName: str(data, 'productName'),
		style: str(data, 'style'),
		styleFamily: str(data, 'styleFamily') as BeerDetails['styleFamily'],
		abv: num(data, 'abv'),
		ibu: num(data, 'ibu'),
		serving: str(data, 'serving'),
		hops: parseNotes(str(data, 'hops')),
		ingredients: parseNotes(str(data, 'ingredients')),
		breweryNotes: parseNotes(str(data, 'breweryNotes')),
		packagedDate: str(data, 'packagedDate'),
		tastedOn: str(data, 'tastedOn'),
		...readLocation(data)
	}

	const notes: BeerNotes = {
		overallRating: num(data, 'overallRating'),
		color: str(data, 'color'),
		clarity: str(data, 'clarity'),
		headRetention: num(data, 'headRetention'),
		appearanceRating: num(data, 'appearanceRating'),
		appearanceNotes: str(data, 'appearanceNotes'),
		aromaIntensity: num(data, 'aromaIntensity'),
		aromaQuality: num(data, 'aromaQuality'),
		aromaNotes: str(data, 'aromaNotes'),
		maltiness: num(data, 'maltiness'),
		hopIntensity: num(data, 'hopIntensity'),
		bitterness: num(data, 'bitterness'),
		sweetness: num(data, 'sweetness'),
		flavorBalance: num(data, 'flavorBalance'),
		flavorNotes: str(data, 'flavorNotes'),
		bodyWeight: num(data, 'bodyWeight'),
		carbonation: num(data, 'carbonation'),
		mouthfeelNotes: str(data, 'mouthfeelNotes'),
		finishLength: num(data, 'finishLength'),
		finishQuality: num(data, 'finishQuality'),
		finishNotes: str(data, 'finishNotes'),
		tasterNotes: parseNotes(str(data, 'tasterNotes')),
		wouldBuyAgain: readBuyAgain(data),
		freeText: str(data, 'freeText')
	}

	return { details, notes }
}

export const actions: Actions = {
	default: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { error: 'Unauthorized' })

		const data = await request.formData()

		const beverageType = str(data, 'beverageType') === 'beer' ? 'beer' : 'coffee'
		const { details, notes } = beverageType === 'beer' ? readBeer(data) : readCoffee(data)

		const hasDetails = Object.values(details).some((v) => v !== undefined)
		const hasNotes = Object.values(notes).some((v) => v !== undefined)

		const parsed = createTastingInputSchema.safeParse({
			beverageType,
			...(hasDetails && { details }),
			...(hasNotes && { notes })
		})
		if (!parsed.success) {
			return fail(400, { error: parsed.error.issues[0].message })
		}

		const qualityScore = computeQualityScore(parsed.data)
		const intensityScore = computeIntensityScore(parsed.data)

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
