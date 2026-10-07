import { z } from 'zod'
import { BREW_METHODS, COUNTRIES, GRIND_SIZES, PROCESSES } from './coffee'

export type BeverageType = 'coffee'

/** Where the pour happened. `'out'` covers anywhere away from home — a cafe, a
 *  friend's place, the office — captured via {@link TastingDetails.locationName}. */
export type PourLocation = 'home' | 'out'

export interface TastingDetails {
	/** The company that roasted the beans. */
	roaster?: string
	productName?: string
	/** Producing country, constrained to {@link COUNTRIES} so origins group cleanly. */
	country?: string
	/** Sub-region within {@link country}, e.g. "Yirgacheffe". Free text. */
	region?: string
	/** How the cherry was processed, e.g. "Washed". */
	process?: string
	/** 1 (light) – 10 (dark) */
	roastLevel?: number
	/** Normalized tags the roaster printed on the bag, e.g. ["raspberry", "vanilla"] */
	roasterNotes?: string[]
	brewMethod?: string
	grindSize?: string
	coffeeGrams?: number
	waterGrams?: number
	waterTempF?: number
	/** Total brew time in seconds — the main controllable alongside grind size. */
	brewTimeSeconds?: number
	roastDate?: string
	brewDate?: string
	location?: PourLocation
	/** Place name, e.g. "Blue Bottle Coffee — Mission". Only set when `location` is `'out'`. */
	locationName?: string
	locationAddress?: string
	locationLat?: number
	locationLng?: number
}

const tastingDetailsObject = z.object({
	roaster: z.string().trim().min(1).max(200).optional(),
	productName: z.string().trim().min(1).max(200).optional(),
	country: z.enum(COUNTRIES).optional(),
	region: z.string().trim().min(1).max(200).optional(),
	process: z.enum(PROCESSES).optional(),
	roastLevel: z.number().int().min(1).max(10).optional(),
	roasterNotes: z.array(z.string().trim().min(1).max(60)).max(20).optional(),
	brewMethod: z.enum(BREW_METHODS).optional(),
	grindSize: z.enum(GRIND_SIZES).optional(),
	coffeeGrams: z.number().positive().max(2000).optional(),
	waterGrams: z.number().positive().max(5000).optional(),
	waterTempF: z.number().min(32).max(220).optional(),
	brewTimeSeconds: z.number().int().positive().max(86_400).optional(),
	roastDate: z.iso.date().optional(),
	brewDate: z.iso.date().optional(),
	location: z.enum(['home', 'out']).optional(),
	locationName: z.string().trim().min(1).max(200).optional(),
	locationAddress: z.string().trim().min(1).max(300).optional(),
	locationLat: z.number().min(-90).max(90).optional(),
	locationLng: z.number().min(-180).max(180).optional()
})

/** Shared by pours and saved defaults so both reject the same impossible recipe. */
function waterCoversCoffee(recipe: { coffeeGrams?: number; waterGrams?: number }): boolean {
	return (
		recipe.coffeeGrams === undefined ||
		recipe.waterGrams === undefined ||
		recipe.waterGrams >= recipe.coffeeGrams
	)
}
const waterCoversCoffeeIssue = {
	message: 'Water weight must be at least the coffee weight',
	path: ['waterGrams']
}

export const tastingDetailsSchema = tastingDetailsObject
	.refine(waterCoversCoffee, waterCoversCoffeeIssue)
	.refine(
		(details) =>
			details.roastDate === undefined ||
			details.brewDate === undefined ||
			details.brewDate >= details.roastDate,
		{ message: 'Brew date cannot be before the roast date', path: ['brewDate'] }
	)

/**
 * The brew setup a user saves on their profile to pre-fill the pour form. Only equipment and
 * recipe fields: the coffee itself changes with every bag, and defaulting ratings would bias
 * the scores the dashboard ranks by. Validated with the same rules as a pour's details.
 */
export const pourDefaultsSchema = tastingDetailsObject
	.pick({
		brewMethod: true,
		grindSize: true,
		coffeeGrams: true,
		waterGrams: true,
		waterTempF: true,
		brewTimeSeconds: true,
		location: true
	})
	.refine(waterCoversCoffee, waterCoversCoffeeIssue)

export type PourDefaults = z.infer<typeof pourDefaultsSchema>

export interface TastingNotes {
	/** 1–10. The taster's direct, holistic judgment — distinct from
	 *  `TastingEntry.qualityScore`, which is computed from the evaluative fields below. */
	overallRating?: number
	/** 1–5. Descriptive: how loud the aroma is, not how good. */
	aromaIntensity?: number
	/** 1–5. Evaluative: how clean and distinct the aroma reads. */
	aromaClarity?: number
	aromaNotes?: string
	/** 1–5. Evaluative. */
	flavorComplexity?: number
	/** 1–5. Evaluative. */
	flavorSweetness?: number
	flavorNotes?: string
	/** 1–5. Descriptive: how much acidity, not how pleasant. */
	acidityIntensity?: number
	/** 1–5. Evaluative: whether the acidity is bright or sour. */
	acidityQuality?: number
	acidityNotes?: string
	/** 1–5. Descriptive: how heavy the cup sits. */
	bodyWeight?: number
	/** 1–5. Descriptive: texture, from thin to syrupy. */
	bodyTactile?: number
	bodyNotes?: string
	/** 1–5. Evaluative: whether the aftertaste is pleasant. */
	finishFlavor?: number
	/** 1–5. Descriptive: how long the finish lasts. */
	finishLength?: number
	finishNotes?: string
	/** Normalized tags for what the taster actually tasted — compare against
	 *  {@link TastingDetails.roasterNotes} to see where palate and bag disagree. */
	tasterNotes?: string[]
	/** The cheapest strong preference signal there is. */
	wouldBuyAgain?: boolean
	freeText?: string
}

/** Sub-ratings that judge how *good* the coffee is. Averaged into
 *  {@link computeQualityScore}. */
const QUALITY_FIELDS = [
	'aromaClarity',
	'flavorComplexity',
	'flavorSweetness',
	'acidityQuality',
	'finishFlavor'
] as const satisfies readonly (keyof TastingNotes)[]

/** Sub-ratings that describe how *loud* the coffee is. Intensity is a preference
 *  axis, not a quality axis — a delicate cup is not a worse cup — so these stay out
 *  of the score and are charted as a profile shape instead. */
const INTENSITY_FIELDS = [
	'aromaIntensity',
	'acidityIntensity',
	'bodyWeight',
	'bodyTactile',
	'finishLength'
] as const satisfies readonly (keyof TastingNotes)[]

function meanOfFields(
	notes: TastingNotes | undefined,
	fields: readonly (keyof TastingNotes)[]
): number | undefined {
	if (!notes) return undefined
	const values = fields
		.map((field) => notes[field])
		.filter((value): value is number => typeof value === 'number')
	if (values.length === 0) return undefined
	return Math.round((values.reduce((sum, v) => sum + v, 0) / values.length) * 10) / 10
}

/**
 * A pour's quality score (1–5): the mean of the *evaluative* sub-ratings only.
 *
 * Deliberately excludes the intensity fields. Averaging "acidity intensity" into a
 * quality score asserts that a louder coffee is a better one, which turns every
 * downstream "best brew method / best roast" claim into a statement about volume
 * rather than preference. `undefined` when the taster rated none of these fields.
 * Computed once at write time and persisted so every consumer reads one number.
 */
export function computeQualityScore(notes: TastingNotes | undefined): number | undefined {
	return meanOfFields(notes, QUALITY_FIELDS)
}

/** A pour's intensity score (1–5): the mean of the descriptive sub-ratings. Pairs
 *  with {@link computeQualityScore} to plot "how loud" against "how good". */
export function computeIntensityScore(notes: TastingNotes | undefined): number | undefined {
	return meanOfFields(notes, INTENSITY_FIELDS)
}

export const tastingNotesSchema = z.object({
	overallRating: z.number().int().min(1).max(10).optional(),
	aromaIntensity: z.number().int().min(1).max(5).optional(),
	aromaClarity: z.number().int().min(1).max(5).optional(),
	aromaNotes: z.string().trim().max(1000).optional(),
	flavorComplexity: z.number().int().min(1).max(5).optional(),
	flavorSweetness: z.number().int().min(1).max(5).optional(),
	flavorNotes: z.string().trim().max(1000).optional(),
	acidityIntensity: z.number().int().min(1).max(5).optional(),
	acidityQuality: z.number().int().min(1).max(5).optional(),
	acidityNotes: z.string().trim().max(1000).optional(),
	bodyWeight: z.number().int().min(1).max(5).optional(),
	bodyTactile: z.number().int().min(1).max(5).optional(),
	bodyNotes: z.string().trim().max(1000).optional(),
	finishFlavor: z.number().int().min(1).max(5).optional(),
	finishLength: z.number().int().min(1).max(5).optional(),
	finishNotes: z.string().trim().max(1000).optional(),
	tasterNotes: z.array(z.string().trim().min(1).max(60)).max(20).optional(),
	wouldBuyAgain: z.boolean().optional(),
	freeText: z.string().trim().max(1000).optional()
})

export interface TastingEntry {
	userId: string
	entryId: string
	beverageType: BeverageType
	createdAt: string
	details?: TastingDetails
	notes?: TastingNotes
	/** Computed by {@link computeQualityScore} at write time; not user-editable. */
	qualityScore?: number
	/** Computed by {@link computeIntensityScore} at write time; not user-editable. */
	intensityScore?: number
}

export type CreateTastingInput = Omit<TastingEntry, 'userId' | 'entryId' | 'createdAt'>

export const createTastingInputSchema = z
	.object({
		beverageType: z.literal('coffee'),
		details: tastingDetailsSchema.optional(),
		notes: tastingNotesSchema.optional()
	})
	// A pour is only worth keeping if it can be rated and identified, so the three
	// up-front fields are required here (not just in the UI) to guard the API too.
	.refine((input) => input.notes?.overallRating !== undefined, {
		message: 'Add an overall rating',
		path: ['notes', 'overallRating']
	})
	.refine((input) => Boolean(input.details?.roaster || input.details?.productName), {
		message: 'Add a roaster or coffee name',
		path: ['details', 'roaster']
	})
	.refine((input) => input.details?.brewMethod !== undefined, {
		message: 'Add a brew method',
		path: ['details', 'brewMethod']
	})

/** The day a pour belongs to on a timeline: the brew date the taster entered, or
 *  the server write time when they left it blank. Every time series uses this —
 *  `createdAt` alone misfiles a pour logged days after it was brewed. */
export function pourDate(entry: TastingEntry): string {
	return entry.details?.brewDate ?? entry.createdAt.slice(0, 10)
}
