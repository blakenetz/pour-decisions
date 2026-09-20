import { parseArgs } from 'node:util'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import {
	DeleteCommand,
	DynamoDBDocumentClient,
	PutCommand,
	QueryCommand
} from '@aws-sdk/lib-dynamodb'
import { ulid } from 'ulid'
import { createTastingInputSchema, type TastingEntry } from '../src/lib/types/tasting'

try {
	process.loadEnvFile('.env')
} catch {
	// .env missing — assume env vars are already exported (e.g. CI)
}

const tableName = process.env.DYNAMODB_TABLE
if (!tableName) throw new Error('DYNAMODB_TABLE is not configured')

const client = new DynamoDBClient({ region: process.env.PUBLIC_AWS_REGION || 'us-west-1' })
const db = DynamoDBDocumentClient.from(client)

const ROASTERS = [
	'Blue Bottle',
	'Intelligentsia',
	'Stumptown',
	'Counter Culture',
	'Onyx Coffee Lab'
]
const REGIONS = [
	'Yirgacheffe, Ethiopia',
	'Huehuetenango, Guatemala',
	'Tarrazú, Costa Rica',
	'Sidamo, Ethiopia',
	'Antigua, Guatemala'
]
const BREW_METHODS = ['Espresso', 'Pour Over', 'French Press', 'Drip', 'Cold Brew', 'AeroPress']
const GRIND_SIZES = [
	'Extra Fine',
	'Fine',
	'Medium-Fine',
	'Medium',
	'Medium-Coarse',
	'Coarse',
	'Extra Coarse'
]
const FLAVOR_NOTES = [
	'raspberry',
	'magnolia',
	'watermelon',
	'vanilla',
	'stone fruit',
	'brown sugar',
	'jasmine',
	'citrus'
]

function pick<T>(values: T[]): T {
	return values[Math.floor(Math.random() * values.length)]
}

function pickMany<T>(values: T[], count: number): T[] {
	const shuffled = [...values].sort(() => Math.random() - 0.5)
	return shuffled.slice(0, count)
}

function randomInt(min: number, max: number): number {
	return Math.floor(Math.random() * (max - min + 1)) + min
}

function dateStringFrom(iso: string): string {
	return iso.slice(0, 10)
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

	for (let i = 0; i < count; i++) {
		const createdAt = new Date(Date.now() - Math.random() * 90 * 86_400_000).toISOString()
		const brewDate = dateStringFrom(createdAt)

		const details = {
			producer: pick(ROASTERS),
			productName: pick(FLAVOR_NOTES),
			region: pick(REGIONS),
			roastLevel: randomInt(1, 10),
			roasterNotes: pickMany(FLAVOR_NOTES, randomInt(1, 4)),
			brewMethod: pick(BREW_METHODS),
			grindSize: pick(GRIND_SIZES),
			coffeeGrams: randomInt(15, 30),
			waterGrams: randomInt(200, 500),
			waterTempF: randomInt(195, 205),
			roastDate: brewDate,
			brewDate
		}

		const notes = {
			aromaIntensity: randomInt(1, 5),
			aromaClarity: randomInt(1, 5),
			flavorComplexity: randomInt(1, 5),
			flavorSweetness: randomInt(1, 5),
			acidityIntensity: randomInt(1, 5),
			acidityQuality: randomInt(1, 5),
			bodyWeight: randomInt(1, 5),
			bodyTactile: randomInt(1, 5),
			finishFlavor: randomInt(1, 5),
			finishLength: randomInt(1, 5)
		}

		const parsed = createTastingInputSchema.safeParse({
			beverageType: 'coffee',
			details,
			notes
		})
		if (!parsed.success) {
			throw new Error(`Generated entry failed validation: ${JSON.stringify(parsed.error.issues)}`)
		}

		const entry: TastingEntry = {
			userId,
			entryId: ulid(),
			createdAt,
			...parsed.data
		}

		await db.send(new PutCommand({ TableName: tableName, Item: entry }))
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
		highCount: { type: 'string', default: '15' }
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
