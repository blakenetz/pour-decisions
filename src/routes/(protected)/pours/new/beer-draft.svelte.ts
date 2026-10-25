import type { BeerDetails, BeerNotes } from '$lib/types/tasting'

const RATING_FIELDS = [
	'headRetention',
	'appearanceRating',
	'aromaIntensity',
	'aromaQuality',
	'maltiness',
	'hopIntensity',
	'bitterness',
	'sweetness',
	'flavorBalance',
	'bodyWeight',
	'carbonation',
	'finishLength',
	'finishQuality'
] as const satisfies readonly (keyof BeerNotes)[]

/**
 * The beer half of the pour form: every field only a beer has, bound by the beer components and
 * filled by the autofills. Fields both beverages share (overall rating, buy again, where, tasting
 * tags, final thoughts) stay page state, so switching beverage keeps them.
 */
export class BeerDraft {
	brewery = $state('')
	productName = $state('')
	style = $state('')
	styleFamily = $state('')
	abv: number | null = $state(null)
	ibu: number | null = $state(null)
	serving = $state('')
	hops: string[] = $state([])
	ingredients: string[] = $state([])
	breweryNotes: string[] = $state([])
	packagedDate = $state('')
	tastedOn = $state(new Date().toISOString().slice(0, 10))

	// Ratings: 0 is "not rated" and isn't submitted.
	headRetention = $state(0)
	appearanceRating = $state(0)
	aromaIntensity = $state(0)
	aromaQuality = $state(0)
	maltiness = $state(0)
	hopIntensity = $state(0)
	bitterness = $state(0)
	sweetness = $state(0)
	flavorBalance = $state(0)
	bodyWeight = $state(0)
	carbonation = $state(0)
	finishLength = $state(0)
	finishQuality = $state(0)

	color = $state('')
	clarity = $state('')
	text = $state({
		appearanceNotes: '',
		aromaNotes: '',
		flavorNotes: '',
		mouthfeelNotes: '',
		finishNotes: ''
	})
	open = $state({
		details: false,
		appearance: false,
		aroma: false,
		flavor: false,
		mouthfeel: false
	})

	/** The beer itself, overwriting its name and leaving fields `d` lacks. */
	fillProduct(d: BeerDetails) {
		this.brewery = d.brewery ?? ''
		this.productName = d.productName ?? ''
		if (d.style) {
			this.style = d.style
			this.styleFamily = d.styleFamily ?? ''
		}
		if (d.abv !== undefined) this.abv = d.abv
		if (d.ibu !== undefined) this.ibu = d.ibu
		if (d.hops) this.hops = [...d.hops]
		if (d.ingredients) this.ingredients = [...d.ingredients]
		if (d.breweryNotes) this.breweryNotes = [...d.breweryNotes]
		if (d.packagedDate) this.packagedDate = d.packagedDate
		// Most of these live in the collapsed Beer Details section; show what was filled.
		this.open.details = true
	}

	/** "Last setup": the beer plus how it was served. */
	fillSetup(d: BeerDetails) {
		this.fillProduct(d)
		if (d.serving) this.serving = d.serving
	}

	/** The beer-only ratings and notes from "Last entry". */
	fillNotes(n: BeerNotes) {
		for (const field of RATING_FIELDS) {
			const value = n[field]
			if (value !== undefined) this[field] = value
		}
		if (n.color) this.color = n.color
		if (n.clarity) this.clarity = n.clarity
		for (const key of Object.keys(this.text) as (keyof typeof this.text)[]) {
			const text = n[key]
			if (text) this.text[key] = text
		}
		this.open.appearance = true
		this.open.aroma = true
		this.open.flavor = true
		this.open.mouthfeel = true
	}
}
