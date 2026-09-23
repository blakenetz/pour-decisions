/**
 * Shared coffee vocabulary. Every enumerated dimension a pour can be grouped by
 * lives here so the form, the validation schema, the seed script and the dashboard
 * all agree on spelling and ordering — a dimension the user can free-type is a
 * dimension the dashboard can't group by.
 */

/** Ordered fine → coarse. The order is the point: `grindRank` turns these into a
 *  sortable axis, since alphabetically "Coarse" precedes "Extra Fine". */
export const GRIND_SIZES = [
	'Extra Fine',
	'Fine',
	'Medium-Fine',
	'Medium',
	'Medium-Coarse',
	'Coarse',
	'Extra Coarse'
] as const

export type GrindSize = (typeof GRIND_SIZES)[number]

/** Position of `size` on the fine → coarse axis, or `null` when it isn't a known
 *  grind. Charts plot against this and label with the original string. */
export function grindRank(size: string | undefined): number | null {
	if (!size) return null
	const index = (GRIND_SIZES as readonly string[]).indexOf(size)
	return index === -1 ? null : index
}

export const BREW_METHODS = [
	'Espresso',
	'Pour Over',
	'French Press',
	'Drip',
	'Cold Brew',
	'AeroPress',
	'Moka Pot',
	'Siphon'
] as const

export type BrewMethod = (typeof BREW_METHODS)[number]

/** How the cherry was processed. Drives cup character at least as strongly as roast
 *  level — naturals read fruity and heavy, washed clean and bright. */
export const PROCESSES = ['Washed', 'Natural', 'Honey', 'Anaerobic', 'Wet-Hulled', 'Other'] as const

export type Process = (typeof PROCESSES)[number]

/** Producing countries, alphabetical. `Other` keeps an unusual origin loggable
 *  without letting free text fragment the main groups. */
export const COUNTRIES = [
	'Bolivia',
	'Brazil',
	'Burundi',
	'Colombia',
	'Costa Rica',
	'Ecuador',
	'El Salvador',
	'Ethiopia',
	'Guatemala',
	'Honduras',
	'India',
	'Indonesia',
	'Jamaica',
	'Kenya',
	'Mexico',
	'Nicaragua',
	'Panama',
	'Papua New Guinea',
	'Peru',
	'Rwanda',
	'Tanzania',
	'Uganda',
	'Vietnam',
	'Yemen',
	'Other'
] as const

export type Country = (typeof COUNTRIES)[number]

/** Roast level 1–10 collapsed into the three bands people actually shop by. */
export function roastBand(level: number): 'Light' | 'Medium' | 'Dark' {
	if (level <= 3) return 'Light'
	if (level <= 7) return 'Medium'
	return 'Dark'
}

export const ROAST_BANDS = ['Light', 'Medium', 'Dark'] as const

/** Lower-cases and trims a flavor tag so "Stone Fruit" and "stone fruit" count as
 *  one note rather than two. Applied at write time — aggregation stays a plain
 *  group-by rather than re-normalizing on every read. */
export function normalizeNote(note: string): string {
	return note.trim().toLowerCase().replace(/\s+/g, ' ')
}

/** Splits a comma-separated tag field into normalized, de-duplicated tags. */
export function parseNotes(input: string | undefined): string[] | undefined {
	if (!input) return undefined
	const tags = [...new Set(input.split(',').map(normalizeNote).filter(Boolean))]
	return tags.length > 0 ? tags : undefined
}
