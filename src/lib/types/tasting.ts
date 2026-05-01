export type BeverageType = 'coffee'

export interface TastingDetails {
	producer?: string
	origin?: string
	productName?: string
	source?: string
	sourceType?: 'cafe' | 'bar' | 'restaurant' | 'retail' | 'home'
	brewMethod?: string
	processMethod?: string
	roastLevel?: string
}

export interface TastingNotes {
	overallRating?: number
	flavorTags?: string[]
	flavorGroups?: string[]
	freeText?: string
	acidity?: number
	sweetness?: number
	body?: number
	bitterness?: number
	boldness?: number
	tannins?: number
	carbonation?: number
	finish?: number
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
