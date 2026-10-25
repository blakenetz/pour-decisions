import { BEER_STYLE_FAMILIES, SERVINGS } from '../types/beer'
import { grindRank, ROAST_BANDS, roastBand } from '../types/coffee'
import { formatGrindSetting, GRINDERS, type GrinderId } from '../types/grinders'
import { BEVERAGES, type BeverageType, pourDate, type TastingEntry } from '../types/tasting'

/**
 * One row per pour, flattened to exactly what the dashboard plots. Coffee and beer share one
 * shape so every chart can mix or filter them; fields the other beverage lacks are `null`.
 *
 * The whole fact table is sent to the client so every filter and breakdown is an
 * instant in-memory regroup rather than a round trip — the point of a drill-down
 * is that following a hunch costs nothing. At ~25 small fields per pour this stays
 * a few hundred KB even for a heavy multi-year logger.
 */
export interface PourFact {
	id: string
	beverage: BeverageType
	/** `YYYY-MM-DD`, the brew or tasted date where known — see {@link pourDate}. */
	date: string
	/** Roaster (coffee) or brewery (beer). */
	producer: string | null
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
	style: string | null
	styleFamily: string | null
	serving: string | null
	abv: number | null
	hops: string[]
	ingredients: string[]
	location: string | null
	/** Mean of the evaluative sub-ratings, 1–5. */
	quality: number | null
	/** Mean of the descriptive sub-ratings, 1–5. */
	intensity: number | null
	/** The taster's direct 1–10 judgment. */
	overall: number | null
	wouldBuyAgain: boolean | null
	/** What the roaster or brewery printed on the label. */
	producerNotes: string[]
	tasterNotes: string[]
	/** The beverage's descriptive axes ({@link PROFILE_AXES}), keyed by axis label. */
	profile: Record<string, number | null>
}

/** The descriptive sub-ratings each beverage's flavor profile is drawn from. */
export const PROFILE_AXES: Record<BeverageType, readonly { label: string; field: string }[]> = {
	coffee: [
		{ label: 'Aroma', field: 'aromaIntensity' },
		{ label: 'Acidity', field: 'acidityIntensity' },
		{ label: 'Body', field: 'bodyWeight' },
		{ label: 'Texture', field: 'bodyTactile' },
		{ label: 'Finish', field: 'finishLength' }
	],
	beer: [
		{ label: 'Aroma', field: 'aromaIntensity' },
		{ label: 'Malt', field: 'maltiness' },
		{ label: 'Hops', field: 'hopIntensity' },
		{ label: 'Bitterness', field: 'bitterness' },
		{ label: 'Body', field: 'bodyWeight' },
		{ label: 'Carbonation', field: 'carbonation' }
	]
}

const MS_PER_DAY = 86_400_000

type BeverageFields = Omit<
	PourFact,
	| 'id'
	| 'beverage'
	| 'date'
	| 'location'
	| 'quality'
	| 'intensity'
	| 'overall'
	| 'wouldBuyAgain'
	| 'tasterNotes'
	| 'profile'
>

const NO_BEVERAGE_FIELDS: BeverageFields = {
	producer: null,
	productName: null,
	country: null,
	region: null,
	process: null,
	brewMethod: null,
	grindSize: null,
	grindRank: null,
	grindSetting: null,
	roastLevel: null,
	roastBand: null,
	daysOffRoast: null,
	ratio: null,
	brewTimeSeconds: null,
	style: null,
	styleFamily: null,
	serving: null,
	abv: null,
	hops: [],
	ingredients: [],
	producerNotes: []
}

function beverageFields(entry: TastingEntry): BeverageFields {
	if (entry.beverageType === 'beer') {
		const beer = entry.details
		return {
			...NO_BEVERAGE_FIELDS,
			producer: beer?.brewery ?? null,
			productName: beer?.productName ?? null,
			style: beer?.style ?? null,
			styleFamily: beer?.styleFamily ?? null,
			serving: beer?.serving ?? null,
			abv: beer?.abv ?? null,
			hops: beer?.hops ?? [],
			ingredients: beer?.ingredients ?? [],
			producerNotes: beer?.breweryNotes ?? []
		}
	}
	const coffee = entry.details

	let daysOffRoast: number | null = null
	if (coffee?.roastDate && coffee?.brewDate) {
		const delta = Date.parse(coffee.brewDate) - Date.parse(coffee.roastDate)
		if (Number.isFinite(delta) && delta >= 0) daysOffRoast = Math.round(delta / MS_PER_DAY)
	}

	return {
		...NO_BEVERAGE_FIELDS,
		producer: coffee?.roaster ?? null,
		productName: coffee?.productName ?? null,
		country: coffee?.country ?? null,
		region: coffee?.region ?? null,
		process: coffee?.process ?? null,
		brewMethod: coffee?.brewMethod ?? null,
		grindSize: coffee?.grindSize ?? null,
		grindRank: grindRank(coffee?.grindSize),
		grindSetting:
			coffee?.grinder && coffee.grinder in GRINDERS && coffee.grindSetting !== undefined
				? formatGrindSetting(coffee.grinder as GrinderId, coffee.grindSetting)
				: null,
		roastLevel: coffee?.roastLevel ?? null,
		roastBand: coffee?.roastLevel !== undefined ? roastBand(coffee.roastLevel) : null,
		daysOffRoast,
		ratio:
			coffee?.coffeeGrams && coffee?.waterGrams
				? Math.round((coffee.waterGrams / coffee.coffeeGrams) * 10) / 10
				: null,
		brewTimeSeconds: coffee?.brewTimeSeconds ?? null,
		producerNotes: coffee?.roasterNotes ?? []
	}
}

export function toPourFact(entry: TastingEntry): PourFact {
	const details = entry.details
	const notes = entry.notes as Record<string, unknown> | undefined
	const profile: Record<string, number | null> = {}
	for (const { label, field } of PROFILE_AXES[entry.beverageType]) {
		const value = notes?.[field]
		profile[label] = typeof value === 'number' ? value : null
	}

	return {
		id: entry.entryId,
		beverage: entry.beverageType,
		date: pourDate(entry),
		...beverageFields(entry),
		location:
			details?.location === 'out'
				? (details.locationName ?? 'Out and about')
				: details?.location === 'home'
					? 'Home'
					: null,
		quality: entry.qualityScore ?? null,
		intensity: entry.intensityScore ?? null,
		overall: entry.notes?.overallRating ?? null,
		wouldBuyAgain: entry.notes?.wouldBuyAgain ?? null,
		tasterNotes: entry.notes?.tasterNotes ?? [],
		profile
	}
}

/* -------------------------------------------------------------------------- */
/* Dimensions — the things you can slice and group by                          */
/* -------------------------------------------------------------------------- */

export type DimensionId =
	| 'beverage'
	| 'brewMethod'
	| 'grindSize'
	| 'country'
	| 'process'
	| 'roastBand'
	| 'producer'
	| 'styleFamily'
	| 'style'
	| 'serving'
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
	beverage: {
		id: 'beverage',
		label: 'Beverage',
		value: (f) => (f.beverage === 'beer' ? 'Beer' : 'Coffee'),
		order: (f) => BEVERAGES.indexOf(f.beverage)
	},
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
	producer: { id: 'producer', label: 'Roaster / Brewery', value: (f) => f.producer },
	styleFamily: {
		id: 'styleFamily',
		label: 'Beer Style',
		value: (f) => f.styleFamily,
		order: (f) => (f.styleFamily ? BEER_STYLE_FAMILIES.indexOf(f.styleFamily as 'IPA') : -1)
	},
	style: { id: 'style', label: 'Style', value: (f) => f.style },
	serving: {
		id: 'serving',
		label: 'Serving',
		value: (f) => f.serving,
		order: (f) => (f.serving ? SERVINGS.indexOf(f.serving as 'Draft') : -1)
	},
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
			'Mean of the evaluative sub-ratings, 1–5 (coffee: clarity, complexity, sweetness, acidity quality, finish; beer: appearance, aroma quality, balance, finish quality).',
		domain: [0, 5],
		value: (f) => f.quality,
		format: (v) => v.toFixed(2)
	},
	overall: {
		id: 'overall',
		label: 'Overall Rating',
		description: 'Your direct 1–10 gut judgment.',
		domain: [0, 10],
		value: (f) => f.overall,
		format: (v) => v.toFixed(1)
	},
	intensity: {
		id: 'intensity',
		label: 'Intensity',
		description: 'Mean of the descriptive sub-ratings, 1–5 — how bold it is, not how good.',
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

/**
 * Groups by hop, where a pour counts once for every hop it was in — so `groupBy`, which gives
 * each pour one value, can't do it. Reduces like `groupBy` (count when `metric` has no per-pour
 * value) and returns the `limit` most-used hops.
 */
export function hopsBy(facts: PourFact[], metric: Metric, limit = 10): Group[] {
	const buckets = new Map<string, { values: number[]; count: number }>()
	for (const fact of facts) {
		const value = metric.value?.(fact)
		for (const hop of fact.hops) {
			let bucket = buckets.get(hop)
			if (!bucket) {
				bucket = { values: [], count: 0 }
				buckets.set(hop, bucket)
			}
			bucket.count++
			if (value !== null && value !== undefined) bucket.values.push(value)
		}
	}
	return [...buckets]
		.map(([name, bucket]) => ({
			name,
			count: bucket.count,
			value:
				metric.value === null
					? bucket.count
					: bucket.values.length === 0
						? null
						: bucket.values.reduce((sum, v) => sum + v, 0) / bucket.values.length
		}))
		.sort((a, b) => b.count - a.count || (a.name < b.name ? -1 : 1))
		.slice(0, limit)
}

/** Mean of each of `beverage`'s descriptive axes over that beverage's pours — the profile
 *  shape of a selection. Other beverages are skipped: coffee's "Body" isn't beer's. */
export function profileOf(
	facts: PourFact[],
	beverage: BeverageType
): { axis: string; value: number }[] {
	const own = facts.filter((fact) => fact.beverage === beverage)
	return PROFILE_AXES[beverage].map(({ label }) => {
		const values = own
			.map((fact) => fact.profile[label] ?? null)
			.filter((value): value is number => value !== null)
		return {
			axis: label,
			value: values.length === 0 ? 0 : values.reduce((sum, v) => sum + v, 0) / values.length
		}
	})
}

export interface NoteComparison {
	note: string
	/** How many pours the roaster or brewery printed this note for. */
	label: number
	/** How many pours you actually tasted it in. */
	you: number
}

/**
 * Flavor notes ranked by how often they appear, split by who claimed them.
 * The gap is the interesting part — notes the label promises that you never taste,
 * and notes you find that no roaster or brewery mentions.
 */
export function compareNotes(facts: PourFact[], limit = 8): NoteComparison[] {
	const counts = new Map<string, NoteComparison>()
	const bump = (note: string, key: 'label' | 'you') => {
		const row = counts.get(note) ?? { note, label: 0, you: 0 }
		row[key]++
		counts.set(note, row)
	}
	for (const fact of facts) {
		for (const note of fact.producerNotes) bump(note, 'label')
		for (const note of fact.tasterNotes) bump(note, 'you')
	}
	return [...counts.values()].sort((a, b) => b.label + b.you - (a.label + a.you)).slice(0, limit)
}

/** Smallest group size worth drawing a conclusion from. Groups below this are
 *  still charted but flagged, so a single lucky pour never reads as a verdict. */
export const MIN_CONFIDENT_GROUP = 3
