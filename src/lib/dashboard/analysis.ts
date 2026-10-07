import { grindRank, ROAST_BANDS, roastBand } from '../types/coffee'
import { formatGrindSetting, GRINDERS, type GrinderId } from '../types/grinders'
import { pourDate, type TastingEntry } from '../types/tasting'

/**
 * One row per pour, flattened to exactly what the dashboard plots.
 *
 * The whole fact table is sent to the client so every filter and breakdown is an
 * instant in-memory regroup rather than a round trip — the point of a drill-down
 * is that following a hunch costs nothing. At ~20 small fields per pour this stays
 * a few hundred KB even for a heavy multi-year logger.
 */
export interface PourFact {
	id: string
	/** `YYYY-MM-DD`, the brew date where known — see {@link pourDate}. */
	date: string
	roaster: string | null
	productName: string | null
	country: string | null
	region: string | null
	process: string | null
	brewMethod: string | null
	grindSize: string | null
	/** Position of `grindSize` on the fine → coarse axis; `null` when unrecorded. */
	grindRank: number | null
	/** Exact dial reading when a catalog grinder was used, e.g. "Encore 14" or "C40 24 clicks". */
	grindSetting: string | null
	roastLevel: number | null
	roastBand: string | null
	/** Days between roast date and brew date — the freshness axis. */
	daysOffRoast: number | null
	/** Water grams per gram of coffee. */
	ratio: number | null
	brewTimeSeconds: number | null
	location: string | null
	/** Mean of the evaluative sub-ratings, 1–5. */
	quality: number | null
	/** Mean of the descriptive sub-ratings, 1–5. */
	intensity: number | null
	/** The taster's direct 1–10 judgment. */
	overall: number | null
	wouldBuyAgain: boolean | null
	roasterNotes: string[]
	tasterNotes: string[]
	/** The five descriptive axes, for profile comparison. */
	profile: {
		aroma: number | null
		acidity: number | null
		body: number | null
		texture: number | null
		finish: number | null
	}
}

const MS_PER_DAY = 86_400_000

export function toPourFact(entry: TastingEntry): PourFact {
	const details = entry.details
	const notes = entry.notes
	const date = pourDate(entry)

	let daysOffRoast: number | null = null
	if (details?.roastDate && details?.brewDate) {
		const delta = Date.parse(details.brewDate) - Date.parse(details.roastDate)
		if (Number.isFinite(delta) && delta >= 0) daysOffRoast = Math.round(delta / MS_PER_DAY)
	}

	return {
		id: entry.entryId,
		date,
		roaster: details?.roaster ?? null,
		productName: details?.productName ?? null,
		country: details?.country ?? null,
		region: details?.region ?? null,
		process: details?.process ?? null,
		brewMethod: details?.brewMethod ?? null,
		grindSize: details?.grindSize ?? null,
		grindRank: grindRank(details?.grindSize),
		grindSetting:
			details?.grinder && details.grinder in GRINDERS && details.grindSetting !== undefined
				? formatGrindSetting(details.grinder as GrinderId, details.grindSetting)
				: null,
		roastLevel: details?.roastLevel ?? null,
		roastBand: details?.roastLevel !== undefined ? roastBand(details.roastLevel) : null,
		daysOffRoast,
		ratio:
			details?.coffeeGrams && details?.waterGrams
				? Math.round((details.waterGrams / details.coffeeGrams) * 10) / 10
				: null,
		brewTimeSeconds: details?.brewTimeSeconds ?? null,
		location:
			details?.location === 'out'
				? (details.locationName ?? 'Out and about')
				: details?.location === 'home'
					? 'Home'
					: null,
		quality: entry.qualityScore ?? null,
		intensity: entry.intensityScore ?? null,
		overall: notes?.overallRating ?? null,
		wouldBuyAgain: notes?.wouldBuyAgain ?? null,
		roasterNotes: details?.roasterNotes ?? [],
		tasterNotes: notes?.tasterNotes ?? [],
		profile: {
			aroma: notes?.aromaIntensity ?? null,
			acidity: notes?.acidityIntensity ?? null,
			body: notes?.bodyWeight ?? null,
			texture: notes?.bodyTactile ?? null,
			finish: notes?.finishLength ?? null
		}
	}
}

/* -------------------------------------------------------------------------- */
/* Dimensions — the things you can slice and group by                          */
/* -------------------------------------------------------------------------- */

export type DimensionId =
	| 'brewMethod'
	| 'grindSize'
	| 'country'
	| 'process'
	| 'roastBand'
	| 'roaster'
	| 'location'

export interface Dimension {
	id: DimensionId
	label: string
	value: (fact: PourFact) => string | null
	/** Fixed category order where the dimension is genuinely ordinal. Without this,
	 *  a grind axis sorts alphabetically — Coarse before Extra Fine — which is
	 *  meaningless for spotting a trend. */
	order?: (fact: PourFact) => number
}

export const DIMENSIONS: Record<DimensionId, Dimension> = {
	brewMethod: { id: 'brewMethod', label: 'Brew Method', value: (f) => f.brewMethod },
	grindSize: {
		id: 'grindSize',
		label: 'Grind Size',
		value: (f) => f.grindSize,
		order: (f) => f.grindRank ?? -1
	},
	country: { id: 'country', label: 'Origin', value: (f) => f.country },
	process: { id: 'process', label: 'Process', value: (f) => f.process },
	roastBand: {
		id: 'roastBand',
		label: 'Roast',
		value: (f) => f.roastBand,
		order: (f) => (f.roastBand ? ROAST_BANDS.indexOf(f.roastBand as 'Light') : -1)
	},
	roaster: { id: 'roaster', label: 'Roaster', value: (f) => f.roaster },
	location: { id: 'location', label: 'Where', value: (f) => f.location }
}

export const DIMENSION_IDS = Object.keys(DIMENSIONS) as DimensionId[]

/* -------------------------------------------------------------------------- */
/* Metrics — the thing being measured                                          */
/* -------------------------------------------------------------------------- */

export type MetricId = 'quality' | 'overall' | 'intensity' | 'buyAgain' | 'count'

export interface Metric {
	id: MetricId
	label: string
	/** Short explanation shown under the chart so the number isn't a mystery. */
	description: string
	domain: [number, number]
	/** Per-pour value, or `null` when this pour can't contribute. `count` has no
	 *  per-pour value — it's the size of the group itself. */
	value: ((fact: PourFact) => number | null) | null
	format: (value: number) => string
}

export const METRICS: Record<MetricId, Metric> = {
	quality: {
		id: 'quality',
		label: 'Quality',
		description:
			'Average of the evaluative sub-ratings — clarity, complexity, sweetness, acidity quality and finish. Excludes intensity, which measures loudness rather than merit.',
		domain: [0, 5],
		value: (f) => f.quality,
		format: (v) => v.toFixed(2)
	},
	overall: {
		id: 'overall',
		label: 'Overall Rating',
		description: 'Your direct 1–10 gut judgment of the cup.',
		domain: [0, 10],
		value: (f) => f.overall,
		format: (v) => v.toFixed(1)
	},
	intensity: {
		id: 'intensity',
		label: 'Intensity',
		description:
			'Average of the descriptive sub-ratings — aroma, acidity, body, texture and finish length. How loud the cup is, not how good.',
		domain: [0, 5],
		value: (f) => f.intensity,
		format: (v) => v.toFixed(2)
	},
	buyAgain: {
		id: 'buyAgain',
		label: 'Would Buy Again',
		description: 'Share of pours you said you would buy again.',
		domain: [0, 100],
		value: (f) => (f.wouldBuyAgain === null ? null : f.wouldBuyAgain ? 100 : 0),
		format: (v) => `${Math.round(v)}%`
	},
	count: {
		id: 'count',
		label: 'Pours',
		description: 'How many pours fall in each group.',
		domain: [0, 0],
		value: null,
		format: (v) => String(Math.round(v))
	}
}

export const METRIC_IDS = Object.keys(METRICS) as MetricId[]

/* -------------------------------------------------------------------------- */
/* Slicing                                                                     */
/* -------------------------------------------------------------------------- */

/** Active drill-down: a chosen value per dimension. Absent key = not filtered. */
export type Filters = Partial<Record<DimensionId, string>>

export function applyFilters(facts: PourFact[], filters: Filters): PourFact[] {
	const active = Object.entries(filters).filter(([, value]) => value)
	if (active.length === 0) return facts
	return facts.filter((fact) =>
		active.every(([id, value]) => DIMENSIONS[id as DimensionId].value(fact) === value)
	)
}

export interface Group {
	name: string
	/** `null` when no pour in the group carried the metric. */
	value: number | null
	count: number
}

/**
 * Groups `facts` by `dimension` and reduces each group with `metric`.
 *
 * Groups are ordered by the dimension's intrinsic order when it has one, and by
 * value descending otherwise — a ranking is the useful default, but forcing a
 * ranking onto an ordinal axis destroys the trend you're looking for.
 */
export function groupBy(facts: PourFact[], dimension: Dimension, metric: Metric): Group[] {
	const buckets = new Map<string, { values: number[]; count: number; order: number }>()

	for (const fact of facts) {
		const name = dimension.value(fact)
		if (name === null) continue
		let bucket = buckets.get(name)
		if (!bucket) {
			bucket = { values: [], count: 0, order: dimension.order?.(fact) ?? 0 }
			buckets.set(name, bucket)
		}
		bucket.count++
		const value = metric.value?.(fact)
		if (value !== null && value !== undefined) bucket.values.push(value)
	}

	const groups: (Group & { order: number })[] = [...buckets].map(([name, bucket]) => ({
		name,
		count: bucket.count,
		order: bucket.order,
		value:
			metric.value === null
				? bucket.count
				: bucket.values.length === 0
					? null
					: bucket.values.reduce((sum, v) => sum + v, 0) / bucket.values.length
	}))

	groups.sort((a, b) =>
		dimension.order ? a.order - b.order : (b.value ?? -Infinity) - (a.value ?? -Infinity)
	)
	return groups.map(({ name, value, count }) => ({ name, value, count }))
}

/** Mean of `metric` across `facts`, or `null` when nothing carries it. */
export function overallMetric(facts: PourFact[], metric: Metric): number | null {
	if (metric.value === null) return facts.length
	const values = facts
		.map((fact) => metric.value?.(fact))
		.filter((value): value is number => value !== null && value !== undefined)
	if (values.length === 0) return null
	return values.reduce((sum, v) => sum + v, 0) / values.length
}

/** Monthly means, chronological — the shape a trend line needs. */
export function monthlyTrend(
	facts: PourFact[],
	metric: Metric
): { month: Date; value: number; count: number }[] {
	const buckets = new Map<string, number[]>()
	for (const fact of facts) {
		const month = fact.date.slice(0, 7)
		const value = metric.value === null ? 1 : metric.value(fact)
		if (value === null || value === undefined) continue
		const values = buckets.get(month) ?? []
		values.push(value)
		buckets.set(month, values)
	}
	return [...buckets]
		.sort(([a], [b]) => (a < b ? -1 : 1))
		.map(([month, values]) => ({
			month: new Date(`${month}-01T00:00:00`),
			count: values.length,
			value:
				metric.value === null
					? values.length
					: values.reduce((sum, v) => sum + v, 0) / values.length
		}))
}

/** Mean of each descriptive axis — the profile shape of a selection. */
export function profileOf(facts: PourFact[]): { axis: string; value: number }[] {
	const axes = [
		['Aroma', 'aroma'],
		['Acidity', 'acidity'],
		['Body', 'body'],
		['Texture', 'texture'],
		['Finish', 'finish']
	] as const

	return axes.map(([label, key]) => {
		const values = facts
			.map((fact) => fact.profile[key])
			.filter((value): value is number => value !== null)
		return {
			axis: label,
			value: values.length === 0 ? 0 : values.reduce((sum, v) => sum + v, 0) / values.length
		}
	})
}

export interface NoteComparison {
	note: string
	/** How many pours the roaster promised this note on. */
	bag: number
	/** How many pours you actually tasted it in. */
	you: number
}

/**
 * Flavor notes ranked by how often they appear, split by who claimed them.
 * The gap is the interesting part — notes the bag promises that you never taste,
 * and notes you find that no roaster mentions.
 */
export function compareNotes(facts: PourFact[], limit = 8): NoteComparison[] {
	const counts = new Map<string, NoteComparison>()
	const bump = (note: string, key: 'bag' | 'you') => {
		const row = counts.get(note) ?? { note, bag: 0, you: 0 }
		row[key]++
		counts.set(note, row)
	}
	for (const fact of facts) {
		for (const note of fact.roasterNotes) bump(note, 'bag')
		for (const note of fact.tasterNotes) bump(note, 'you')
	}
	return [...counts.values()].sort((a, b) => b.bag + b.you - (a.bag + a.you)).slice(0, limit)
}

/** Smallest group size worth drawing a conclusion from. Groups below this are
 *  still charted but flagged, so a single lucky pour never reads as a verdict. */
export const MIN_CONFIDENT_GROUP = 3
