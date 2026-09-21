import { z } from 'zod'

export type BeverageType = 'coffee'

/** Where the pour happened. `'out'` covers anywhere away from home — a cafe, a
 *  friend's place, the office — captured via {@link TastingDetails.locationName}. */
export type PourLocation = 'home' | 'out'

export interface TastingDetails {
	producer?: string
	productName?: string
	region?: string
	/** 1 (light) – 10 (dark) */
	roastLevel?: number
	/** e.g. ["raspberry", "magnolia", "watermelon", "vanilla"] */
	roasterNotes?: string[]
	brewMethod?: string
	grindSize?: string
	coffeeGrams?: number
	waterGrams?: number
	waterTempF?: number
	roastDate?: string
	brewDate?: string
	location?: PourLocation
	/** Place name, e.g. "Blue Bottle Coffee — Mission". Only set when `location` is `'out'`. */
	locationName?: string
	locationAddress?: string
	locationLat?: number
	locationLng?: number
}

export const tastingDetailsSchema = z.object({
	producer: z.string().trim().min(1).max(200).optional(),
	productName: z.string().trim().min(1).max(200).optional(),
	region: z.string().trim().min(1).max(200).optional(),
	roastLevel: z.number().int().min(1).max(10).optional(),
	roasterNotes: z.array(z.string().trim().min(1).max(60)).max(20).optional(),
	brewMethod: z.string().trim().min(1).max(100).optional(),
	grindSize: z.string().trim().min(1).max(100).optional(),
	coffeeGrams: z.number().positive().max(2000).optional(),
	waterGrams: z.number().positive().max(5000).optional(),
	waterTempF: z.number().min(32).max(220).optional(),
	roastDate: z.iso.date().optional(),
	brewDate: z.iso.date().optional(),
	location: z.enum(['home', 'out']).optional(),
	locationName: z.string().trim().min(1).max(200).optional(),
	locationAddress: z.string().trim().min(1).max(300).optional(),
	locationLat: z.number().min(-90).max(90).optional(),
	locationLng: z.number().min(-180).max(180).optional()
})

export interface TastingNotes {
	/** 1–10. Direct taster judgment — distinct from `TastingEntry.avgCategoryRating`,
	 *  which is computed from the fields below. */
	overallRating?: number
	/** 1–5 */
	aromaIntensity?: number
	/** 1–5 */
	aromaClarity?: number
	aromaNotes?: string
	/** 1–5 */
	flavorComplexity?: number
	/** 1–5 */
	flavorSweetness?: number
	flavorNotes?: string
	/** 1–5 */
	acidityIntensity?: number
	/** 1–5 */
	acidityQuality?: number
	acidityNotes?: string
	/** 1–5 */
	bodyWeight?: number
	/** 1–5 */
	bodyTactile?: number
	bodyNotes?: string
	/** 1–5 */
	finishFlavor?: number
	/** 1–5 */
	finishLength?: number
	finishNotes?: string
	freeText?: string
}

/**
 * A pour's average category rating — the mean of every rated sub-metric the taster
 * filled in (aroma/flavor/acidity/body/finish, 2 fields each, 1–5). Distinct from
 * `TastingNotes.overallRating`, the taster's direct 1–10 judgment. `undefined` when
 * a pour has no category ratings at all. Computed once at write time and persisted
 * on the entry so every downstream consumer (dashboard aggregates, future pour
 * lists) reads the same number instead of recomputing it from raw fields.
 */
export function computeAvgCategoryRating(notes: TastingNotes | undefined): number | undefined {
	if (!notes) return undefined
	const values = [
		notes.aromaIntensity,
		notes.aromaClarity,
		notes.flavorComplexity,
		notes.flavorSweetness,
		notes.acidityIntensity,
		notes.acidityQuality,
		notes.bodyWeight,
		notes.bodyTactile,
		notes.finishFlavor,
		notes.finishLength
	].filter((v): v is number => v !== undefined)
	if (values.length === 0) return undefined
	return Math.round((values.reduce((sum, v) => sum + v, 0) / values.length) * 10) / 10
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
	freeText: z.string().trim().max(1000).optional()
})

export interface TastingEntry {
	userId: string
	entryId: string
	beverageType: BeverageType
	createdAt: string
	details?: TastingDetails
	notes?: TastingNotes
	/** Computed by {@link computeAvgCategoryRating} at write time; not user-editable. */
	avgCategoryRating?: number
}

export type CreateTastingInput = Omit<TastingEntry, 'userId' | 'entryId' | 'createdAt'>

export const createTastingInputSchema = z.object({
	beverageType: z.literal('coffee'),
	details: tastingDetailsSchema.optional(),
	notes: tastingNotesSchema.optional()
})
