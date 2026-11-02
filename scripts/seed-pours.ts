import { parseArgs } from 'node:util'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import {
	DeleteCommand,
	DynamoDBDocumentClient,
	PutCommand,
	QueryCommand
} from '@aws-sdk/lib-dynamodb'
import { ulid } from 'ulid'
import {
	type BEER_CLARITY,
	type BEER_COLORS,
	BEER_FLAVOR_NOTES,
	type BeerStyleFamily,
	SERVINGS
} from '../src/lib/types/beer'
import {
	type BrewMethod,
	type Country,
	GRIND_SIZES,
	type GrindSize,
	normalizeNote,
	type Process
} from '../src/lib/types/coffee'
import {
	computeIntensityScore,
	computeQualityScore,
	createTastingInputSchema,
	type TastingEntry
} from '../src/lib/types/tasting'

try {
	process.loadEnvFile('.env')
} catch {
	// .env missing — assume env vars are already exported (e.g. CI)
}

const tableName = process.env.DYNAMODB_TABLE
if (!tableName) throw new Error('DYNAMODB_TABLE is not configured')

const client = new DynamoDBClient({ region: process.env.PUBLIC_AWS_REGION || 'us-west-1' })
const db = DynamoDBDocumentClient.from(client, {
	marshallOptions: { removeUndefinedValues: true }
})

/* --------------------------------------------------------------------------
 * Why this script models rather than randomizes
 *
 * Independent random values make every chart a flat line with error bars: no
 * grind size beats another, no origin pairs with a roast. Dev data is then
 * useless for judging whether a visualization actually surfaces an insight.
 *
 * So each pour is generated from a simulated palate with deliberate structure:
 *   - brew method x grind size  — every method has a correct grind; missing it
 *     by two steps produces a noticeably worse cup
 *   - origin x roast level      — this palate likes Ethiopian and Kenyan light,
 *     and Sumatran and Brazilian dark
 *   - process                   — naturals read fruity, heavy and sweet;
 *     washed reads clean and bright
 *   - days off roast            — a freshness curve peaking around two weeks
 * Every fourth pour is a beer, from a palate that favors IPAs and sours over
 * lagers and stouts, likes its IPAs fresh, and has a soft spot for citra and
 * mosaic. Its descriptive ratings follow the style, not the quality.
 * Ratings are then sampled around that latent quality with noise, so the
 * signal is real but not trivially clean.
 * ----------------------------------------------------------------------- */

/** Deterministic PRNG (mulberry32) so a given user always reseeds to the same
 *  pours — dashboards stay stable across reseeds while screenshots are compared. */
function createRandom(seed: number): () => number {
	let state = seed >>> 0
	return () => {
		state = (state + 0x6d2b79f5) >>> 0
		let t = state
		t = Math.imul(t ^ (t >>> 15), t | 1)
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296
	}
}

function hashString(value: string): number {
	let hash = 2166136261
	for (let i = 0; i < value.length; i++) {
		hash ^= value.charCodeAt(i)
		hash = Math.imul(hash, 16777619)
	}
	return hash >>> 0
}

interface Coffee {
	roaster: string
	productName: string
	country: Country
	region: string
	process: Process
	/** Roast level the bag actually is, 1 (light) – 10 (dark). */
	roastLevel: number
	roasterNotes: string[]
}

/** A deliberately uneven catalogue: multiple lots per origin at different roast
 *  levels, so "dark vs light for Ethiopian" has both sides to compare. */
const CATALOGUE: Coffee[] = [
	{
		roaster: 'Blue Bottle',
		productName: 'Yirgacheffe Konga',
		country: 'Ethiopia',
		region: 'Yirgacheffe',
		process: 'Washed',
		roastLevel: 2,
		roasterNotes: ['jasmine', 'lemon', 'bergamot']
	},
	{
		roaster: 'Onyx Coffee Lab',
		productName: 'Guji Natural',
		country: 'Ethiopia',
		region: 'Guji',
		process: 'Natural',
		roastLevel: 3,
		roasterNotes: ['blueberry', 'strawberry', 'cocoa']
	},
	{
		roaster: 'Stumptown',
		productName: 'Sidamo Reserve',
		country: 'Ethiopia',
		region: 'Sidamo',
		process: 'Washed',
		roastLevel: 8,
		roasterNotes: ['dark chocolate', 'walnut']
	},
	{
		roaster: 'Counter Culture',
		productName: 'Nyeri AA',
		country: 'Kenya',
		region: 'Nyeri',
		process: 'Washed',
		roastLevel: 3,
		roasterNotes: ['blackcurrant', 'grapefruit', 'tomato']
	},
	{
		roaster: 'Intelligentsia',
		productName: 'Kirinyaga Peaberry',
		country: 'Kenya',
		region: 'Kirinyaga',
		process: 'Washed',
		roastLevel: 7,
		roasterNotes: ['plum', 'brown sugar']
	},
	{
		roaster: 'Intelligentsia',
		productName: 'Huila Reserve',
		country: 'Colombia',
		region: 'Huila',
		process: 'Washed',
		roastLevel: 5,
		roasterNotes: ['caramel', 'red apple', 'almond']
	},
	{
		roaster: 'Onyx Coffee Lab',
		productName: 'Nariño Anaerobic',
		country: 'Colombia',
		region: 'Nariño',
		process: 'Anaerobic',
		roastLevel: 4,
		roasterNotes: ['lychee', 'rum', 'tropical fruit']
	},
	{
		roaster: 'Counter Culture',
		productName: 'Huehuetenango',
		country: 'Guatemala',
		region: 'Huehuetenango',
		process: 'Washed',
		roastLevel: 6,
		roasterNotes: ['milk chocolate', 'orange', 'toffee']
	},
	{
		roaster: 'Blue Bottle',
		productName: 'Tarrazú Honey',
		country: 'Costa Rica',
		region: 'Tarrazú',
		process: 'Honey',
		roastLevel: 5,
		roasterNotes: ['honey', 'apricot', 'vanilla']
	},
	{
		roaster: 'Stumptown',
		productName: 'Mandheling',
		country: 'Indonesia',
		region: 'Sumatra',
		process: 'Wet-Hulled',
		roastLevel: 9,
		roasterNotes: ['cedar', 'tobacco', 'dark chocolate']
	},
	{
		roaster: 'Stumptown',
		productName: 'Cerrado Dark',
		country: 'Brazil',
		region: 'Cerrado',
		process: 'Natural',
		roastLevel: 9,
		roasterNotes: ['peanut', 'fudge', 'brown sugar']
	},
	{
		roaster: 'Blue Bottle',
		productName: 'Santos Espresso',
		country: 'Brazil',
		region: 'Mogiana',
		process: 'Natural',
		roastLevel: 7,
		roasterNotes: ['hazelnut', 'molasses']
	}
]

/** The grind each method actually wants, as an index into `GRIND_SIZES`. */
const IDEAL_GRIND: Record<BrewMethod, number> = {
	Espresso: 0,
	AeroPress: 1,
	'Moka Pot': 1,
	'Pour Over': 2,
	Drip: 3,
	Siphon: 3,
	'French Press': 5,
	'Cold Brew': 6
}

/** Typical total brew time in seconds per method, before per-pour variation. */
const TYPICAL_BREW_SECONDS: Record<BrewMethod, number> = {
	Espresso: 28,
	AeroPress: 90,
	'Moka Pot': 240,
	'Pour Over': 195,
	Drip: 300,
	Siphon: 210,
	'French Press': 270,
	'Cold Brew': 57_600
}

/** How much this palate enjoys each origin at each end of the roast spectrum.
 *  `light` applies at roast level 1, `dark` at 10, interpolated between. */
const ROAST_AFFINITY: Record<string, { light: number; dark: number }> = {
	Ethiopia: { light: 1, dark: 0.15 },
	Kenya: { light: 0.95, dark: 0.25 },
	Colombia: { light: 0.7, dark: 0.55 },
	Guatemala: { light: 0.6, dark: 0.6 },
	'Costa Rica': { light: 0.75, dark: 0.45 },
	Indonesia: { light: 0.3, dark: 0.85 },
	Brazil: { light: 0.35, dark: 0.8 }
}

/** Descriptive character each process pushes, on a -1..1 scale per axis. */
const PROCESS_CHARACTER: Record<Process, { fruit: number; acidity: number; body: number }> = {
	Washed: { fruit: -0.3, acidity: 0.8, body: -0.3 },
	Natural: { fruit: 0.9, acidity: 0.1, body: 0.6 },
	Honey: { fruit: 0.4, acidity: 0.3, body: 0.3 },
	Anaerobic: { fruit: 1, acidity: 0.4, body: 0.4 },
	'Wet-Hulled': { fruit: -0.5, acidity: -0.7, body: 0.9 },
	Other: { fruit: 0, acidity: 0, body: 0 }
}

const TASTER_VOCAB: Record<'fruity' | 'balanced' | 'heavy', string[]> = {
	fruity: ['blueberry', 'citrus', 'stone fruit', 'floral', 'lemon', 'raspberry'],
	balanced: ['caramel', 'red apple', 'honey', 'brown sugar', 'orange'],
	heavy: ['dark chocolate', 'cedar', 'molasses', 'tobacco', 'roasted nut']
}

const CAFES = [
	'Blue Bottle Coffee',
	'Sightglass Coffee',
	'Ritual Coffee Roasters',
	'Four Barrel Coffee',
	'Philz Coffee'
]

const BREW_METHOD_POOL: BrewMethod[] = [
	'Pour Over',
	'Pour Over',
	'Pour Over',
	'Espresso',
	'Espresso',
	'AeroPress',
	'French Press',
	'Drip',
	'Cold Brew',
	'Moka Pot'
]

/** Clamps `value` to 1–5 and rounds — the shape every sub-rating has to fit. */
function toRating(value: number): number {
	return Math.max(1, Math.min(5, Math.round(value)))
}

interface GeneratedPour {
	entry: Omit<TastingEntry, 'userId' | 'entryId'>
}

function generateCoffeePour(random: () => number): GeneratedPour {
	const coffee = CATALOGUE[Math.floor(random() * CATALOGUE.length)]
	const brewMethod = BREW_METHOD_POOL[Math.floor(random() * BREW_METHOD_POOL.length)]

	// Grind usually lands near the method's ideal, but drifts often enough that
	// the grind-vs-quality relationship has points across the axis.
	const drift = Math.round((random() - 0.5) * 4)
	const grindIndex = Math.max(0, Math.min(GRIND_SIZES.length - 1, IDEAL_GRIND[brewMethod] + drift))
	const grindSize: GrindSize = GRIND_SIZES[grindIndex]
	const grindError = Math.abs(grindIndex - IDEAL_GRIND[brewMethod])

	// Brew time tracks the grind: finer than ideal runs long, coarser runs fast.
	const baseSeconds = TYPICAL_BREW_SECONDS[brewMethod]
	const timeFactor = 1 + (IDEAL_GRIND[brewMethod] - grindIndex) * 0.18 + (random() - 0.5) * 0.15
	const brewTimeSeconds = Math.max(5, Math.round(baseSeconds * timeFactor))

	const brewedAt = new Date(Date.now() - random() * 120 * 86_400_000)
	const daysOffRoast = Math.round(4 + random() * 40)
	const roastedAt = new Date(brewedAt.getTime() - daysOffRoast * 86_400_000)

	// --- latent quality, 0..1 -------------------------------------------------
	const affinity = ROAST_AFFINITY[coffee.country] ?? { light: 0.6, dark: 0.6 }
	const darkness = (coffee.roastLevel - 1) / 9
	const originFit = affinity.light + (affinity.dark - affinity.light) * darkness

	// Two grind steps off is a meaningfully worse cup; four is a bad one.
	const grindFit = Math.max(0, 1 - grindError * 0.3)

	// Freshness peaks around 14 days off roast and falls away either side.
	const freshnessFit = Math.max(0, 1 - Math.abs(daysOffRoast - 14) / 30)

	const quality = Math.max(
		0,
		Math.min(1, originFit * 0.45 + grindFit * 0.35 + freshnessFit * 0.2 + (random() - 0.5) * 0.18)
	)

	// --- descriptive character, independent of quality ------------------------
	const character = PROCESS_CHARACTER[coffee.process]
	const roastBodyPush = darkness * 1.2
	const noise = () => (random() - 0.5) * 0.9

	const notes = {
		overallRating: Math.max(1, Math.min(10, Math.round(1 + quality * 9 + (random() - 0.5) * 1.5))),

		// Evaluative — track latent quality.
		aromaClarity: toRating(1.5 + quality * 3.5 + noise()),
		flavorComplexity: toRating(1.5 + quality * 3.5 + noise()),
		flavorSweetness: toRating(1.8 + quality * 2.8 + character.fruit * 0.5 + noise()),
		acidityQuality: toRating(1.5 + quality * 3.5 + noise()),
		finishFlavor: toRating(1.5 + quality * 3.5 + noise()),

		// Descriptive — track process and roast, not quality.
		aromaIntensity: toRating(3 + character.fruit * 1.2 + noise()),
		acidityIntensity: toRating(3 + character.acidity * 1.5 - roastBodyPush * 0.5 + noise()),
		bodyWeight: toRating(2.8 + character.body * 1.2 + roastBodyPush * 0.6 + noise()),
		bodyTactile: toRating(2.8 + character.body * 1 + roastBodyPush * 0.5 + noise()),
		finishLength: toRating(2.8 + character.body * 0.8 + roastBodyPush * 0.5 + noise()),

		tasterNotes: pickTasterNotes(coffee, character.fruit, random),
		wouldBuyAgain: quality + (random() - 0.5) * 0.2 > 0.62,
		freeText: undefined
	}

	const location: 'home' | 'out' = random() < 0.72 ? 'home' : 'out'
	const coffeeGrams = brewMethod === 'Espresso' ? 18 : 15 + Math.round(random() * 15)
	const ratio = brewMethod === 'Espresso' ? 2 : 15 + random() * 2

	const details = {
		roaster: coffee.roaster,
		productName: coffee.productName,
		country: coffee.country,
		region: coffee.region,
		process: coffee.process,
		roastLevel: coffee.roastLevel,
		roasterNotes: coffee.roasterNotes.map(normalizeNote),
		brewMethod,
		grindSize,
		coffeeGrams,
		waterGrams: Math.round(coffeeGrams * ratio),
		waterTempF: brewMethod === 'Cold Brew' ? 70 : 198 + Math.round(random() * 6),
		brewTimeSeconds,
		roastDate: roastedAt.toISOString().slice(0, 10),
		brewDate: brewedAt.toISOString().slice(0, 10),
		location,
		...(location === 'out' && { locationName: CAFES[Math.floor(random() * CAFES.length)] })
	}

	const parsed = createTastingInputSchema.safeParse({ beverageType: 'coffee', details, notes })
	if (!parsed.success) {
		throw new Error(`Generated entry failed validation: ${JSON.stringify(parsed.error.issues)}`)
	}

	const qualityScore = computeQualityScore(parsed.data)
	const intensityScore = computeIntensityScore(parsed.data)

	return {
		entry: {
			createdAt: brewedAt.toISOString(),
			...parsed.data,
			...(qualityScore !== undefined && { qualityScore }),
			...(intensityScore !== undefined && { intensityScore })
		}
	}
}

/** Taster tags drawn from the cup's actual character — overlapping the roaster's
 *  notes only part of the time, which is what makes the comparison interesting. */
function pickTasterNotes(coffee: Coffee, fruit: number, random: () => number): string[] {
	const bucket = fruit > 0.5 ? 'fruity' : fruit < -0.2 ? 'heavy' : 'balanced'
	const tags = new Set<string>()
	// Agree with the bag roughly half the time.
	for (const note of coffee.roasterNotes) {
		if (random() < 0.45) tags.add(normalizeNote(note))
	}
	const vocab = TASTER_VOCAB[bucket]
	const extra = 1 + Math.floor(random() * 2)
	for (let i = 0; i < extra; i++) {
		tags.add(normalizeNote(vocab[Math.floor(random() * vocab.length)]))
	}
	return [...tags]
}

interface Beer {
	brewery: string
	productName: string
	style: string
	/** Only for custom styles; catalogue styles get theirs from the schema. */
	styleFamily?: BeerStyleFamily
	/** The family this palate scores it by, whether derived or custom. */
	family: BeerStyleFamily
	abv: number
	ibu: number
	hops: string[]
	ingredients: string[]
	breweryNotes: string[]
	color: (typeof BEER_COLORS)[number]
	clarity: (typeof BEER_CLARITY)[number]
}

/** One of each style family this palate drinks, plus a custom style ("Cold IPA"). */
const BEER_CATALOGUE: Beer[] = [
	{
		brewery: 'Tree House',
		productName: 'Julius',
		style: 'Hazy IPA',
		family: 'IPA',
		abv: 6.8,
		ibu: 35,
		hops: ['citra', 'mosaic', 'simcoe'],
		ingredients: ['oats', 'wheat'],
		breweryNotes: ['mango', 'passion fruit', 'orange'],
		color: 'Gold',
		clarity: 'Hazy'
	},
	{
		brewery: 'Firestone Walker',
		productName: 'Union Jack',
		style: 'West Coast IPA',
		family: 'IPA',
		abv: 7,
		ibu: 70,
		hops: ['cascade', 'centennial', 'simcoe', 'amarillo'],
		ingredients: [],
		breweryNotes: ['grapefruit', 'pine', 'resin'],
		color: 'Gold',
		clarity: 'Clear'
	},
	{
		brewery: 'Wayfinder',
		productName: 'Original Cold IPA',
		style: 'Cold IPA',
		styleFamily: 'IPA',
		family: 'IPA',
		abv: 6.9,
		ibu: 55,
		hops: ['el dorado', 'mosaic', 'strata'],
		ingredients: ['rice', 'corn'],
		breweryNotes: ['lime', 'tropical fruit', 'crisp'],
		color: 'Straw',
		clarity: 'Brilliant'
	},
	{
		brewery: 'Firestone Walker',
		productName: 'Pivo Pils',
		style: 'Pilsner',
		family: 'Lager & Pilsner',
		abv: 5.3,
		ibu: 40,
		hops: ['hallertau mittelfrüh', 'saaz'],
		ingredients: ['pilsner malt'],
		breweryNotes: ['floral', 'cracker', 'crisp'],
		color: 'Straw',
		clarity: 'Brilliant'
	},
	{
		brewery: 'Founders',
		productName: 'Imperial Stout',
		style: 'Imperial Stout',
		family: 'Stout & Porter',
		abv: 10.5,
		ibu: 90,
		hops: ['chinook'],
		ingredients: ['roasted barley', 'chocolate malt', 'oats'],
		breweryNotes: ['chocolate', 'coffee', 'roast'],
		color: 'Black',
		clarity: 'Opaque'
	},
	{
		brewery: 'Cascade Brewing',
		productName: 'Kriek',
		style: 'Fruited Sour',
		family: 'Sour & Wild',
		abv: 7.3,
		ibu: 8,
		hops: [],
		ingredients: ['cherry', 'lactobacillus', 'oak'],
		breweryNotes: ['cherry', 'tart', 'oak'],
		color: 'Copper',
		clarity: 'Clear'
	},
	{
		brewery: 'Brasserie Dupont',
		productName: 'Saison Dupont',
		style: 'Saison',
		family: 'Belgian',
		abv: 6.5,
		ibu: 30,
		hops: ['east kent goldings'],
		ingredients: ['pilsner malt'],
		breweryNotes: ['spicy', 'earthy', 'dry'],
		color: 'Gold',
		clarity: 'Hazy'
	},
	{
		brewery: 'Weihenstephaner',
		productName: 'Hefeweissbier',
		style: 'Hefeweizen',
		family: 'Wheat',
		abv: 5.4,
		ibu: 14,
		hops: ['hallertau mittelfrüh'],
		ingredients: ['wheat'],
		breweryNotes: ['banana', 'clove', 'bready'],
		color: 'Gold',
		clarity: 'Hazy'
	}
]

/** How much this palate enjoys each family, 0..1. */
const FAMILY_AFFINITY: Partial<Record<BeerStyleFamily, number>> = {
	IPA: 0.85,
	'Sour & Wild': 0.8,
	Belgian: 0.6,
	Wheat: 0.55,
	'Lager & Pilsner': 0.35,
	'Stout & Porter': 0.3
}

/** Typical descriptive character per family, on the 1–5 rating scale. Bitterness comes from
 *  the beer's IBU instead. */
const FAMILY_CHARACTER: Partial<
	Record<
		BeerStyleFamily,
		{ aroma: number; malt: number; hops: number; sweet: number; body: number; carb: number }
	>
> = {
	IPA: { aroma: 4.3, malt: 2, hops: 4.6, sweet: 2.4, body: 3, carb: 3 },
	'Lager & Pilsner': { aroma: 2.4, malt: 2.6, hops: 2.6, sweet: 2, body: 2, carb: 4.2 },
	'Stout & Porter': { aroma: 4, malt: 4.8, hops: 1.8, sweet: 3.6, body: 4.7, carb: 2.2 },
	'Sour & Wild': { aroma: 4, malt: 1.5, hops: 1.2, sweet: 2, body: 2.2, carb: 3.8 },
	Belgian: { aroma: 3.8, malt: 2.8, hops: 2.2, sweet: 2.2, body: 2.8, carb: 4.5 },
	Wheat: { aroma: 3.8, malt: 2.8, hops: 1.5, sweet: 2.6, body: 3, carb: 4.2 }
}

const DEFAULT_CHARACTER = { aroma: 3, malt: 3, hops: 3, sweet: 2.5, body: 3, carb: 3 }

function generateBeerPour(random: () => number): GeneratedPour {
	const beer = BEER_CATALOGUE[Math.floor(random() * BEER_CATALOGUE.length)]
	const tastedAt = new Date(Date.now() - random() * 120 * 86_400_000)
	const daysOld = Math.round(3 + random() * 57)
	const packagedAt = new Date(tastedAt.getTime() - daysOld * 86_400_000)

	// --- latent quality, 0..1 -------------------------------------------------
	const affinity = FAMILY_AFFINITY[beer.family] ?? 0.5
	// Hops fade fast, so freshness matters far more to an IPA than to a stout.
	const freshness = 1 - (daysOld - 3) / 57
	const freshnessBonus = freshness * (beer.family === 'IPA' ? 0.25 : 0.05)
	const hopBonus = beer.hops.some((hop) => hop === 'citra' || hop === 'mosaic') ? 0.1 : 0
	const quality = Math.max(
		0,
		Math.min(1, affinity * 0.7 + freshnessBonus + hopBonus + (random() - 0.5) * 0.18)
	)

	// --- descriptive character, from the style --------------------------------
	const character = FAMILY_CHARACTER[beer.family] ?? DEFAULT_CHARACTER
	const noise = () => (random() - 0.5) * 0.9

	const notes = {
		overallRating: Math.max(1, Math.min(10, Math.round(1 + quality * 9 + (random() - 0.5) * 1.5))),
		color: beer.color,
		clarity: beer.clarity,

		// Evaluative — track latent quality.
		appearanceRating: toRating(2 + quality * 3 + noise()),
		aromaQuality: toRating(1.5 + quality * 3.5 + noise()),
		flavorBalance: toRating(1.5 + quality * 3.5 + noise()),
		finishQuality: toRating(1.5 + quality * 3.5 + noise()),

		// Descriptive — track the style, not quality.
		headRetention: toRating(character.carb - 0.3 + noise()),
		aromaIntensity: toRating(character.aroma + noise()),
		maltiness: toRating(character.malt + noise()),
		hopIntensity: toRating(character.hops + noise()),
		bitterness: toRating(1 + beer.ibu / 22 + noise()),
		sweetness: toRating(character.sweet + noise()),
		bodyWeight: toRating(character.body + noise()),
		carbonation: toRating(character.carb + noise()),
		finishLength: toRating(2.5 + (character.body - 3) * 0.5 + beer.ibu / 60 + noise()),

		tasterNotes: pickBeerTasterNotes(beer, random),
		wouldBuyAgain: quality + (random() - 0.5) * 0.2 > 0.62
	}

	const location: 'home' | 'out' = random() < 0.7 ? 'home' : 'out'
	const details = {
		brewery: beer.brewery,
		productName: beer.productName,
		style: beer.style,
		...(beer.styleFamily && { styleFamily: beer.styleFamily }),
		abv: beer.abv,
		ibu: beer.ibu,
		serving: SERVINGS[Math.floor(random() * SERVINGS.length)],
		...(beer.hops.length > 0 && { hops: beer.hops }),
		...(beer.ingredients.length > 0 && { ingredients: beer.ingredients }),
		breweryNotes: beer.breweryNotes,
		packagedDate: packagedAt.toISOString().slice(0, 10),
		tastedOn: tastedAt.toISOString().slice(0, 10),
		location,
		...(location === 'out' && { locationName: CAFES[Math.floor(random() * CAFES.length)] })
	}

	const parsed = createTastingInputSchema.safeParse({ beverageType: 'beer', details, notes })
	if (!parsed.success) {
		throw new Error(`Generated beer failed validation: ${JSON.stringify(parsed.error.issues)}`)
	}

	const qualityScore = computeQualityScore(parsed.data)
	const intensityScore = computeIntensityScore(parsed.data)

	return {
		entry: {
			createdAt: tastedAt.toISOString(),
			...parsed.data,
			...(qualityScore !== undefined && { qualityScore }),
			...(intensityScore !== undefined && { intensityScore })
		}
	}
}

/** About half the brewery's notes, plus up to two of the taster's own. */
function pickBeerTasterNotes(beer: Beer, random: () => number): string[] {
	const tags = new Set<string>()
	for (const note of beer.breweryNotes) {
		if (random() < 0.5) tags.add(note)
	}
	const extra = Math.floor(random() * 3)
	for (let i = 0; i < extra; i++) {
		tags.add(BEER_FLAVOR_NOTES[Math.floor(random() * BEER_FLAVOR_NOTES.length)])
	}
	return [...tags]
}

async function seedUserPours(
	userId: string,
	count: number,
	options: { clear?: boolean } = {}
): Promise<void> {
	if (options.clear) {
		const result = await db.send(
			new QueryCommand({
				TableName: tableName,
				KeyConditionExpression: 'userId = :userId',
				ExpressionAttributeValues: { ':userId': userId }
			})
		)
		for (const item of result.Items ?? []) {
			await db.send(
				new DeleteCommand({ TableName: tableName, Key: { userId, entryId: item.entryId } })
			)
		}
	}

	const random = createRandom(hashString(userId))

	for (let i = 0; i < count; i++) {
		// Every fourth pour is a beer: 120 pours are 90 coffees and 30 beers.
		const { entry } = i % 4 === 3 ? generateBeerPour(random) : generateCoffeePour(random)
		await db.send(
			new PutCommand({ TableName: tableName, Item: { ...entry, userId, entryId: ulid() } })
		)
	}

	console.log(`${userId} -> ${count} pour(s)`)
}

function usage(): never {
	console.error(
		'Usage:\n' +
			'  tsx scripts/seed-pours.ts --userId=<id> --count=<n> [--clear]\n' +
			'  tsx scripts/seed-pours.ts --zero=<id> --low=<id> --high=<id> [--lowCount=5] [--highCount=120]'
	)
	process.exit(1)
}

const { values } = parseArgs({
	options: {
		userId: { type: 'string' },
		count: { type: 'string' },
		clear: { type: 'boolean' },
		zero: { type: 'string' },
		low: { type: 'string' },
		high: { type: 'string' },
		lowCount: { type: 'string', default: '5' },
		highCount: { type: 'string', default: '120' }
	}
})

async function main() {
	if (values.zero || values.low || values.high) {
		const missing = ['zero', 'low', 'high'].filter((key) => !values[key as 'zero' | 'low' | 'high'])
		if (missing.length > 0) {
			console.error(
				`Tiered mode requires --zero, --low, and --high. Missing: ${missing.join(', ')}`
			)
			process.exit(1)
		}

		const lowCount = Number(values.lowCount)
		if (!Number.isInteger(lowCount) || lowCount < 1 || lowCount > 10) {
			console.error('--lowCount must be an integer in [1, 10]')
			process.exit(1)
		}

		const highCount = Number(values.highCount)
		if (!Number.isInteger(highCount) || highCount < 11) {
			console.error('--highCount must be an integer >= 11')
			process.exit(1)
		}

		await seedUserPours(values.zero as string, 0, { clear: true })
		await seedUserPours(values.low as string, lowCount, { clear: true })
		await seedUserPours(values.high as string, highCount, { clear: true })
		return
	}

	if (values.userId && values.count) {
		// --count=0 with --clear empties the account, e.g. after an e2e spec logged pours.
		const count = Number(values.count)
		if (!Number.isInteger(count) || count < 0 || (count === 0 && !values.clear)) {
			console.error('--count must be a non-negative integer (0 requires --clear)')
			process.exit(1)
		}
		await seedUserPours(values.userId, count, { clear: !!values.clear })
		return
	}

	usage()
}

await main()
