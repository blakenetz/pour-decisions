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

/** Drinks built on a shot of espresso. Picking one fills Brew Method with `'Espresso'`. */
export const ESPRESSO_DRINKS = [
	'Espresso',
	'Americano',
	'Macchiato',
	'Cortado',
	'Flat White',
	'Cappuccino',
	'Latte',
	'Mocha'
] as const

/** Drinks served straight from a brewer rather than built on espresso. */
export const BREWED_DRINKS = ['Black Coffee', 'Café au Lait', 'Iced Coffee', 'Cold Brew'] as const

/** What ended up in the cup, as opposed to how it was extracted ({@link BREW_METHODS}). */
export const DRINK_STYLES = [...BREWED_DRINKS, ...ESPRESSO_DRINKS, 'Other'] as const

export type DrinkStyle = (typeof DRINK_STYLES)[number]

/** The brew method a drink style implies, if any. The form only uses this as a starting
 *  value; the taster can still change it, since a moka-pot latte is still a latte. */
export function impliedBrewMethod(style: string): BrewMethod | undefined {
	if ((ESPRESSO_DRINKS as readonly string[]).includes(style)) return 'Espresso'
	if (style === 'Cold Brew') return 'Cold Brew'
	return undefined
}

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

/** Common cupping descriptors (after the SCA flavor wheel), already normalized. Seeds tag
 *  suggestions so the bag's notes and the taster's notes land on the same spelling, which is
 *  what lets the dashboard line them up. */
export const FLAVOR_NOTES = [
	// Berry & dried fruit
	'blackberry',
	'blackcurrant',
	'blueberry',
	'raspberry',
	'strawberry',
	'cherry',
	'raisin',
	'prune',
	'date',
	'fig',
	// Fruit
	'red apple',
	'green apple',
	'pear',
	'peach',
	'apricot',
	'plum',
	'grape',
	'pomegranate',
	'watermelon',
	'tropical fruit',
	'mango',
	'pineapple',
	'papaya',
	'passion fruit',
	'lychee',
	'coconut',
	// Citrus
	'lemon',
	'lime',
	'orange',
	'tangerine',
	'grapefruit',
	'bergamot',
	// Floral & tea
	'jasmine',
	'rose',
	'hibiscus',
	'chamomile',
	'lavender',
	'orange blossom',
	'black tea',
	'green tea',
	// Sweet
	'honey',
	'caramel',
	'brown sugar',
	'molasses',
	'maple syrup',
	'toffee',
	'butterscotch',
	'vanilla',
	'marshmallow',
	// Nut & cocoa
	'almond',
	'hazelnut',
	'peanut',
	'pecan',
	'walnut',
	'cocoa',
	'milk chocolate',
	'dark chocolate',
	'cacao nib',
	'fudge',
	// Spice
	'cinnamon',
	'clove',
	'nutmeg',
	'cardamom',
	'ginger',
	'anise',
	'black pepper',
	// Roasted & other
	'toast',
	'malt',
	'graham cracker',
	'cedar',
	'tobacco',
	'smoke',
	'red wine',
	'rum',
	'whiskey',
	'butter',
	'cream',
	'herbal',
	'mint',
	'tomato'
] as const

/** Splits a comma-separated tag field into normalized, de-duplicated tags. */
export function parseNotes(input: string | undefined): string[] | undefined {
	if (!input) return undefined
	const tags = [...new Set(input.split(',').map(normalizeNote).filter(Boolean))]
	return tags.length > 0 ? tags : undefined
}
