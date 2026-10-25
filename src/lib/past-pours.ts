import { type BeerStyleFamily, canonicalStyle } from './types/beer'
import {
	type BeerDetails,
	type BeerNotes,
	type BeverageType,
	type CoffeeDetails,
	type CoffeeNotes,
	type EntryPick,
	pourDate
} from './types/tasting'

/** Just the parts of a pour the form's autofills need: no ids or computed scores. */
export type PastPourSource = EntryPick<'beverageType' | 'details' | 'notes' | 'createdAt'>

/** A coffee or beer the taster has logged before, as it stood on their latest pour of it. */
export interface PastProduct {
	/** Lowercased `producer|productName`. */
	key: string
	/** Roaster (coffee) or brewery (beer). */
	producer?: string
	productName?: string
	/** Subtitle parts: coffee `[country, process]`, beer `[style, abv%]`. */
	facts: string[]
	/** The latest pour's details, used for filling the form. */
	details: CoffeeDetails | BeerDetails
	/** Date of the latest pour of this product (YYYY-MM-DD). */
	lastBrewed: string
	pourCount: number
}

function producerOf(entry: PastPourSource): string | undefined {
	return entry.beverageType === 'beer' ? entry.details?.brewery : entry.details?.roaster
}

function factsOf(entry: PastPourSource): string[] {
	const facts =
		entry.beverageType === 'beer'
			? [entry.details?.style, entry.details?.abv ? `${entry.details.abv}%` : undefined]
			: [entry.details?.country, entry.details?.process]
	return facts.filter((fact): fact is string => Boolean(fact))
}

/** One entry per distinct producer + name of `beverage`, most recently drunk first. Spelling
 *  is compared case-insensitively, so "blue bottle" and "Blue Bottle" are one coffee. */
export function pastProducts(
	entries: readonly PastPourSource[],
	beverage: BeverageType
): PastProduct[] {
	const byKey = new Map<string, PastProduct>()
	for (const entry of entries) {
		if (entry.beverageType !== beverage || !entry.details) continue
		const producer = producerOf(entry)
		const productName = entry.details.productName
		if (!producer && !productName) continue
		const key = `${producer ?? ''}|${productName ?? ''}`.toLowerCase()
		const brewed = pourDate(entry)
		const existing = byKey.get(key)
		if (existing && existing.lastBrewed >= brewed) {
			existing.pourCount += 1
			continue
		}
		byKey.set(key, {
			key,
			producer,
			productName,
			facts: factsOf(entry),
			details: entry.details,
			lastBrewed: brewed,
			pourCount: (existing?.pourCount ?? 0) + 1
		})
	}
	return [...byKey.values()].sort((a, b) => (a.lastBrewed < b.lastBrewed ? 1 : -1))
}

/** The most recently drunk pour, for "Last setup" and "Last entry". */
export type LastPour = {
	/** Its brew or tasted date (YYYY-MM-DD). */
	brewed: string
} & (
	| { beverageType: 'coffee'; details: CoffeeDetails; notes?: CoffeeNotes }
	| { beverageType: 'beer'; details: BeerDetails; notes?: BeerNotes }
)

/** Latest by pour date, of `beverage` when given; pours on the same day are ordered by when
 *  they were logged. */
export function lastPour(
	entries: readonly PastPourSource[],
	beverage?: BeverageType
): LastPour | undefined {
	let latest: { entry: PastPourSource; brewed: string } | undefined
	for (const entry of entries) {
		if (!entry.details) continue
		if (beverage && entry.beverageType !== beverage) continue
		const brewed = pourDate(entry)
		if (
			!latest ||
			brewed > latest.brewed ||
			(brewed === latest.brewed && entry.createdAt > latest.entry.createdAt)
		) {
			latest = { entry, brewed }
		}
	}
	if (!latest) return undefined
	const { entry, brewed } = latest
	return entry.beverageType === 'beer'
		? { beverageType: 'beer', details: entry.details ?? {}, notes: entry.notes, brewed }
		: { beverageType: 'coffee', details: entry.details ?? {}, notes: entry.notes, brewed }
}

/** A place away from home the taster has logged a pour at. */
export interface PastVenue {
	name: string
	address?: string
	lat?: number
	lng?: number
}

/** Distinct venues from pours logged "out", most recently visited first. Venues are compared by
 *  name and address, case-insensitively, so two branches of one chain stay separate. Covers
 *  every beverage: cafes pour beer and bars pour coffee. */
export function pastVenues(entries: readonly PastPourSource[], limit = 5): PastVenue[] {
	const latest = new Map<string, { venue: PastVenue; brewed: string }>()
	for (const entry of entries) {
		const details = entry.details
		if (details?.location !== 'out' || !details.locationName) continue
		const key = `${details.locationName}|${details.locationAddress ?? ''}`.toLowerCase()
		const brewed = pourDate(entry)
		const seen = latest.get(key)
		if (seen && seen.brewed >= brewed) continue
		latest.set(key, {
			venue: {
				name: details.locationName,
				address: details.locationAddress,
				lat: details.locationLat,
				lng: details.locationLng
			},
			brewed
		})
	}
	return [...latest.values()]
		.sort((a, b) => (a.brewed < b.brewed ? 1 : -1))
		.slice(0, limit)
		.map(({ venue }) => venue)
}

function byUse(tags: Iterable<string>): string[] {
	const counts = new Map<string, number>()
	for (const tag of tags) counts.set(tag, (counts.get(tag) ?? 0) + 1)
	return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([tag]) => tag)
}

/** Every flavor note the taster has used on `beverage`, from the label (roaster's or
 *  brewery's) and their own palate, most used first. */
export function pastNotes(entries: readonly PastPourSource[], beverage: BeverageType): string[] {
	return byUse(
		entries.flatMap((entry) => {
			if (entry.beverageType !== beverage) return []
			const label =
				entry.beverageType === 'beer' ? entry.details?.breweryNotes : entry.details?.roasterNotes
			return [...(label ?? []), ...(entry.notes?.tasterNotes ?? [])]
		})
	)
}

/** Hop or ingredient tags from past beers, most used first. */
export function pastBeerTags(
	entries: readonly PastPourSource[],
	field: 'hops' | 'ingredients'
): string[] {
	return byUse(
		entries.flatMap((entry) =>
			entry.beverageType === 'beer' ? (entry.details?.[field] ?? []) : []
		)
	)
}

/** Styles the taster added themselves (not in the catalogue), most recently drunk first, so the
 *  style picker can offer them again under the same spelling. */
export function pastCustomStyles(
	entries: readonly PastPourSource[]
): { style: string; family: BeerStyleFamily }[] {
	const latest = new Map<string, { style: string; family: BeerStyleFamily; brewed: string }>()
	for (const entry of entries) {
		if (entry.beverageType !== 'beer' || !entry.details?.style) continue
		if (canonicalStyle(entry.details.style).family !== undefined) continue
		const key = entry.details.style.toLowerCase()
		const brewed = pourDate(entry)
		const seen = latest.get(key)
		if (seen && seen.brewed >= brewed) continue
		latest.set(key, {
			style: entry.details.style,
			family: entry.details.styleFamily ?? 'Specialty',
			brewed
		})
	}
	return [...latest.values()]
		.sort((a, b) => (a.brewed < b.brewed ? 1 : -1))
		.map(({ style, family }) => ({ style, family }))
}

/** Past products whose producer or name contains `query`; with no query, the most recent ones. */
export function matchProducts(
	products: readonly PastProduct[],
	query: string,
	limit = 5
): PastProduct[] {
	const term = query.trim().toLowerCase()
	if (!term) return products.slice(0, limit)
	return products
		.filter((product) =>
			`${product.producer ?? ''} ${product.productName ?? ''}`.toLowerCase().includes(term)
		)
		.slice(0, limit)
}
