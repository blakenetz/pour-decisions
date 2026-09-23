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

function generatePour(random: () => number): GeneratedPour {
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

	const qualityScore = computeQualityScore(parsed.data.notes)
	const intensityScore = computeIntensityScore(parsed.data.notes)

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
		const { entry } = generatePour(random)
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
			'  tsx scripts/seed-pours.ts --zero=<id> --low=<id> --high=<id> [--lowCount=5] [--highCount=15]'
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
		const count = Number(values.count)
		if (!Number.isInteger(count) || count < 1) {
			console.error('--count must be a positive integer')
			process.exit(1)
		}
		await seedUserPours(values.userId, count, { clear: !!values.clear })
		return
	}

	usage()
}

await main()
