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

export interface TastingEntry {
	userId: string
	entryId: string
	beverageType: BeverageType
	createdAt: string
	details?: TastingDetails
	notes?: TastingNotes
}

export type CreateTastingInput = Omit<TastingEntry, 'userId' | 'entryId' | 'createdAt'>
