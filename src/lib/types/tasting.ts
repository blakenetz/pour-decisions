import { z } from 'zod'

export type BeverageType = 'coffee'

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
	brewDate: z.iso.date().optional()
})

export interface TastingNotes {
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

export const tastingNotesSchema = z.object({
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
}

export type CreateTastingInput = Omit<TastingEntry, 'userId' | 'entryId' | 'createdAt'>

export const createTastingInputSchema = z.object({
	beverageType: z.literal('coffee'),
	details: tastingDetailsSchema.optional(),
	notes: tastingNotesSchema.optional()
})
