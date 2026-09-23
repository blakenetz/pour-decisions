import { parseArgs } from 'node:util'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb'
import { COUNTRIES, normalizeNote } from '../src/lib/types/coffee'
import {
	computeIntensityScore,
	computeQualityScore,
	type TastingEntry
} from '../src/lib/types/tasting'

/**
 * One-shot migration to the split-origin / split-score schema. Rewrites entries
 * written before those changes:
 *
 *   - `details.producer`           -> `details.roaster` (the field always held the
 *                                     roasting company, despite the name)
 *   - `details.region`             -> `details.country` + `details.region`, e.g.
 *                                     "Yirgacheffe, Ethiopia" becomes
 *                                     { country: "Ethiopia", region: "Yirgacheffe" }
 *   - `entry.avgCategoryRating`    -> `qualityScore` + `intensityScore`, recomputed
 *                                     from the raw sub-ratings rather than carried
 *                                     over, since the old number mixed the two
 *   - `details.roasterNotes`       -> normalized casing so tags group
 *
 * Idempotent: entries already in the new shape are left untouched.
 */

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

/** Entry shape as it may exist on disk, including the pre-migration fields. */
type LegacyEntry = TastingEntry & {
	avgCategoryRating?: number
	details?: TastingEntry['details'] & { producer?: string }
}

const COUNTRY_SET = new Set<string>(COUNTRIES)

/** Splits a legacy free-text region into country + sub-region when the trailing
 *  segment names a known origin. Returns `null` when it can't be split, leaving
 *  the original value alone rather than guessing. */
function splitRegion(region: string): { country: string; region?: string } | null {
	const segments = region
		.split(',')
		.map((segment) => segment.trim())
		.filter(Boolean)
	if (segments.length === 0) return null

	const last = segments[segments.length - 1]
	if (COUNTRY_SET.has(last)) {
		const rest = segments.slice(0, -1).join(', ')
		return { country: last, region: rest || undefined }
	}
	// Single-segment values that are themselves a country, e.g. "Ethiopia".
	if (segments.length === 1 && COUNTRY_SET.has(segments[0])) {
		return { country: segments[0] }
	}
	return null
}

function migrateEntry(entry: LegacyEntry): TastingEntry | null {
	let changed = false
	const details = { ...entry.details } as LegacyEntry['details'] & Record<string, unknown>

	if (details?.producer !== undefined) {
		details.roaster = details.roaster ?? details.producer
		delete details.producer
		changed = true
	}

	if (details?.region && details.country === undefined) {
		const split = splitRegion(details.region)
		if (split) {
			details.country = split.country
			details.region = split.region
			changed = true
		}
	}

	if (details?.roasterNotes) {
		const normalized = [...new Set(details.roasterNotes.map(normalizeNote))]
		if (normalized.join('|') !== details.roasterNotes.join('|')) {
			details.roasterNotes = normalized
			changed = true
		}
	}

	const qualityScore = computeQualityScore(entry.notes)
	const intensityScore = computeIntensityScore(entry.notes)
	if (
		entry.avgCategoryRating !== undefined ||
		entry.qualityScore !== qualityScore ||
		entry.intensityScore !== intensityScore
	) {
		changed = true
	}

	if (!changed) return null

	const migrated: TastingEntry = {
		userId: entry.userId,
		entryId: entry.entryId,
		beverageType: entry.beverageType,
		createdAt: entry.createdAt,
		...(entry.details && { details: details as TastingEntry['details'] }),
		...(entry.notes && { notes: entry.notes }),
		...(qualityScore !== undefined && { qualityScore }),
		...(intensityScore !== undefined && { intensityScore })
	}
	return migrated
}

const { values } = parseArgs({ options: { apply: { type: 'boolean' } } })

async function main() {
	const dryRun = !values.apply
	let scanned = 0
	let migrated = 0
	let startKey: Record<string, unknown> | undefined

	do {
		const result = await db.send(
			new ScanCommand({ TableName: tableName, ExclusiveStartKey: startKey })
		)
		for (const item of (result.Items ?? []) as LegacyEntry[]) {
			scanned++
			const next = migrateEntry(item)
			if (!next) continue
			migrated++
			if (dryRun) {
				console.log(
					`would migrate ${next.entryId}: roaster=${next.details?.roaster ?? '—'} ` +
						`country=${next.details?.country ?? '—'} region=${next.details?.region ?? '—'} ` +
						`quality=${next.qualityScore ?? '—'} intensity=${next.intensityScore ?? '—'}`
				)
			} else {
				await db.send(new PutCommand({ TableName: tableName, Item: next }))
			}
		}
		startKey = result.LastEvaluatedKey
	} while (startKey)

	console.log(
		dryRun
			? `\nDry run: ${migrated}/${scanned} entries would change. Re-run with --apply to write.`
			: `\nMigrated ${migrated}/${scanned} entries.`
	)
}

await main()
