/**
 * Shared beer vocabulary, the counterpart of `coffee.ts`. Styles are a catalogue rather
 * than an enum: tasters can add their own (e.g. "Cold IPA"), so the catalogue only fixes
 * the spelling and family of the styles it knows.
 */

/** Broad families styles group under. The dashboard's "Beer Style" breakdown uses this
 *  order, and a custom style must pick one so it still lands in a group. */
export const BEER_STYLE_FAMILIES = [
	'IPA',
	'Pale Ale',
	'Lager & Pilsner',
	'Wheat',
	'Belgian',
	'Sour & Wild',
	'Stout & Porter',
	'Amber & Brown',
	'Strong & Barrel-Aged',
	'Specialty'
] as const

export type BeerStyleFamily = (typeof BEER_STYLE_FAMILIES)[number]

function family(name: BeerStyleFamily, styles: readonly string[]) {
	return styles.map((style) => ({ style, family: name }))
}

/** Known styles with their family. Deliberately not exhaustive — anything missing is
 *  logged as a custom style. */
export const BEER_STYLES: readonly { style: string; family: BeerStyleFamily }[] = [
	...family('IPA', [
		'American IPA',
		'West Coast IPA',
		'Hazy IPA',
		'Double IPA',
		'Session IPA',
		'Black IPA',
		'Brut IPA'
	]),
	...family('Pale Ale', [
		'American Pale Ale',
		'English Pale Ale',
		'Extra Special Bitter',
		'Blonde Ale',
		'Cream Ale'
	]),
	...family('Lager & Pilsner', [
		'Pilsner',
		'Helles',
		'Mexican Lager',
		'Light Lager',
		'Märzen',
		'Vienna Lager',
		'Dunkel',
		'Bock',
		'Doppelbock',
		'Schwarzbier',
		'Kölsch'
	]),
	...family('Wheat', ['Hefeweizen', 'Witbier', 'American Wheat']),
	...family('Belgian', [
		'Saison',
		'Belgian Dubbel',
		'Belgian Tripel',
		'Belgian Quad',
		'Belgian Golden Strong'
	]),
	...family('Sour & Wild', ['Gose', 'Berliner Weisse', 'Fruited Sour', 'Lambic', 'Flanders Red']),
	...family('Stout & Porter', [
		'Dry Stout',
		'Milk Stout',
		'Oatmeal Stout',
		'Imperial Stout',
		'Pastry Stout',
		'Porter'
	]),
	...family('Amber & Brown', ['Amber Ale', 'Red Ale', 'Brown Ale', 'Scotch Ale']),
	...family('Strong & Barrel-Aged', ['Barleywine', 'Barrel-Aged Stout', 'Old Ale']),
	...family('Specialty', ['Cider', 'Fruit Beer', 'Smoked Beer', 'Non-Alcoholic'])
]

const STYLE_BY_KEY = new Map(BEER_STYLES.map((entry) => [entry.style.toLowerCase(), entry]))

/** Cleans a typed style and resolves it against {@link BEER_STYLES}. A catalogue match
 *  returns the catalogue spelling and family; anything else is a custom style, returned
 *  cleaned with `family: undefined`. */
export function canonicalStyle(input: string): {
	style: string
	family: BeerStyleFamily | undefined
} {
	const cleaned = input.trim().replace(/\s+/g, ' ')
	const known = STYLE_BY_KEY.get(cleaned.toLowerCase())
	return known ? { ...known } : { style: cleaned, family: undefined }
}

/** How the beer reached the glass. Freshness and carbonation both depend on it. */
export const SERVINGS = ['Draft', 'Can', 'Bottle', 'Cask', 'Growler'] as const

export type Serving = (typeof SERVINGS)[number]

/** Ordered light → dark. */
export const BEER_COLORS = ['Straw', 'Gold', 'Amber', 'Copper', 'Brown', 'Black'] as const

export const BEER_CLARITY = ['Brilliant', 'Clear', 'Hazy', 'Opaque'] as const

/** Common hop varieties, normalized. Tag suggestions only — new hops appear every year. */
export const HOPS = [
	'citra',
	'mosaic',
	'simcoe',
	'galaxy',
	'nelson sauvin',
	'cascade',
	'centennial',
	'amarillo',
	'el dorado',
	'sabro',
	'strata',
	'idaho 7',
	'motueka',
	'riwaka',
	'nectaron',
	'talus',
	'azacca',
	'chinook',
	'columbus',
	'citra cryo',
	'mosaic cryo',
	'saaz',
	'hallertau mittelfrüh',
	'tettnang',
	'east kent goldings',
	'fuggle',
	'magnum',
	'warrior',
	'vic secret',
	'ekuanot'
] as const

/** Malts, adjuncts and yeast worth calling out, normalized. Tag suggestions only. */
export const BEER_INGREDIENTS = [
	// Malt & grain
	'pilsner malt',
	'maris otter',
	'munich malt',
	'crystal malt',
	'chocolate malt',
	'roasted barley',
	'wheat',
	'oats',
	'rye',
	'rice',
	'corn',
	// Adjuncts
	'lactose',
	'honey',
	'maple',
	'vanilla',
	'cacao',
	'coffee',
	'coconut',
	'cinnamon',
	'raspberry',
	'mango',
	'passion fruit',
	'cherry',
	'peach',
	'lime',
	'sea salt',
	// Yeast & bugs
	'kveik',
	'brettanomyces',
	'lactobacillus',
	// Aging
	'bourbon barrel',
	'oak'
] as const

/** Common beer descriptors, normalized. Seeds note suggestions so the brewery's notes and
 *  the taster's notes land on the same spelling. */
export const BEER_FLAVOR_NOTES = [
	// Hop
	'citrus',
	'grapefruit',
	'orange',
	'lemon',
	'lime',
	'pine',
	'resin',
	'dank',
	// Fruit
	'tropical fruit',
	'mango',
	'pineapple',
	'passion fruit',
	'stone fruit',
	'peach',
	'berry',
	'cherry',
	// Green & spice
	'grassy',
	'herbal',
	'floral',
	'spicy',
	// Yeast
	'clove',
	'banana',
	'bubblegum',
	// Malt
	'bready',
	'biscuit',
	'cracker',
	'honey',
	'caramel',
	'toffee',
	'toast',
	'nutty',
	// Roast
	'chocolate',
	'coffee',
	'roast',
	'smoke',
	// Barrel & adjunct
	'vanilla',
	'coconut',
	'oak',
	'bourbon',
	// Character
	'tart',
	'funky',
	'earthy',
	'sweet',
	'dry',
	'crisp'
] as const
