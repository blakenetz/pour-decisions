import {
	pourDate,
	type TastingDetails,
	type TastingEntry,
	type TastingNotes
} from './types/tasting'

/** Just the parts of a pour the form's autofills need: no ids or computed scores. */
export type PastPourSource = Pick<TastingEntry, 'details' | 'notes' | 'createdAt'>

/** A coffee the taster has logged before, as it stood on their latest pour of it. */
export interface PastCoffee {
	key: string
	roaster?: string
	productName?: string
	country?: string
	region?: string
	process?: string
	roastLevel?: number
	roasterNotes?: string[]
	roastDate?: string
	/** Date of the latest pour of this coffee (YYYY-MM-DD). */
	lastBrewed: string
	pourCount: number
}

/** One entry per distinct roaster + coffee name, most recently brewed first. Spelling is
 *  compared case-insensitively, so "blue bottle" and "Blue Bottle" are one coffee. */
export function pastCoffees(entries: readonly PastPourSource[]): PastCoffee[] {
	const byKey = new Map<string, PastCoffee>()
	for (const entry of entries) {
		const details = entry.details
		if (!details?.roaster && !details?.productName) continue
		const key = `${details.roaster ?? ''}|${details.productName ?? ''}`.toLowerCase()
		const brewed = pourDate(entry)
		const existing = byKey.get(key)
		if (existing && existing.lastBrewed >= brewed) {
			existing.pourCount += 1
			continue
		}
		byKey.set(key, {
			key,
			roaster: details.roaster,
			productName: details.productName,
			country: details.country,
			region: details.region,
			process: details.process,
			roastLevel: details.roastLevel,
			roasterNotes: details.roasterNotes,
			roastDate: details.roastDate,
			lastBrewed: brewed,
			pourCount: (existing?.pourCount ?? 0) + 1
		})
	}
	return [...byKey.values()].sort((a, b) => (a.lastBrewed < b.lastBrewed ? 1 : -1))
}

/** The most recently brewed pour, for "Last setup" and "Last entry". */
export interface LastPour {
	details: TastingDetails
	notes?: TastingNotes
	/** Its brew date (YYYY-MM-DD). */
	brewed: string
}

/** Latest by brew date; pours on the same day are ordered by when they were logged. */
export function lastPour(entries: readonly PastPourSource[]): LastPour | undefined {
	let latest: (LastPour & { createdAt: string }) | undefined
	for (const entry of entries) {
		if (!entry.details) continue
		const brewed = pourDate(entry)
		if (
			!latest ||
			brewed > latest.brewed ||
			(brewed === latest.brewed && entry.createdAt > latest.createdAt)
		) {
			latest = { details: entry.details, notes: entry.notes, brewed, createdAt: entry.createdAt }
		}
	}
	return latest && { details: latest.details, notes: latest.notes, brewed: latest.brewed }
}

/** A place away from home the taster has logged a pour at. */
export interface PastVenue {
	name: string
	address?: string
	lat?: number
	lng?: number
}

/** Distinct venues from pours logged "out", most recently visited first. Venues are compared by
 *  name and address, case-insensitively, so two branches of one chain stay separate. */
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

/** Every flavor note the taster has used, from bags and their own palate, most used first. */
export function pastNotes(entries: readonly PastPourSource[]): string[] {
	const counts = new Map<string, number>()
	for (const entry of entries) {
		for (const note of [
			...(entry.details?.roasterNotes ?? []),
			...(entry.notes?.tasterNotes ?? [])
		]) {
			counts.set(note, (counts.get(note) ?? 0) + 1)
		}
	}
	return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([note]) => note)
}

/** Past coffees whose roaster or name contains `query`; with no query, the most recent ones. */
export function matchCoffees(
	coffees: readonly PastCoffee[],
	query: string,
	limit = 5
): PastCoffee[] {
	const term = query.trim().toLowerCase()
	if (!term) return coffees.slice(0, limit)
	return coffees
		.filter((coffee) =>
			`${coffee.roaster ?? ''} ${coffee.productName ?? ''}`.toLowerCase().includes(term)
		)
		.slice(0, limit)
}
