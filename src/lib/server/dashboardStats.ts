import type { TastingEntry, TastingNotes } from '../types/tasting'

export interface DashboardStats {
	totalPours: number
	/** Mean of every scored pour's `avgCategoryRating` (the computed average of the
	 *  detailed 1-5 category sub-ratings — distinct from the taster's direct 1-10
	 *  `overallRating`). */
	avgCategoryRating: number | null
	/** Delta between the second half and first half of scored pours (chronological). */
	avgCategoryRatingTrend: number | null
	avgRoastLevel: number | null
	topFlavorNotes: { name: string; count: number }[]
	bestBrewMethod: { name: string; avgScore: number; count: number } | null
	bestRoastBand: { name: string; avgScore: number; count: number } | null
	/** Avg score per region, top 8 by pour count — feeds the region radar chart. */
	regionScores: { name: string; avgScore: number; count: number }[]
	/** Avg score per roaster, top 8 by pour count — feeds the roaster radar chart. */
	roasterScores: { name: string; avgScore: number; count: number }[]
	/** Avg of the two sub-ratings within each category (1-5) — feeds the taste profile chart. */
	ratingsByCategory: { category: string; value: number | null }[]
	/** One point per pour with both a roast level and a computed rating — feeds the
	 *  roast-level-vs-rating scatter chart. */
	roastVsRating: { roastLevel: number; rating: number }[]
	/** Home vs. out-and-about pour counts — feeds the location split donut chart. */
	locationSplit: { location: string; count: number }[]
	personalBest: {
		score: number
		roaster: string | null
		region: string | null
		date: string
	} | null
}

/** Minimum pours a group (brew method, roast band, roaster, region) needs before its
 *  average is surfaced — avoids a single lucky/unlucky pour skewing a "best X" claim. */
const MIN_GROUP_SIZE = 2

function mean(values: number[]): number | null {
	if (values.length === 0) return null
	return values.reduce((sum, v) => sum + v, 0) / values.length
}

function roastBand(level: number): string {
	if (level <= 3) return 'Light'
	if (level <= 7) return 'Medium'
	return 'Dark'
}

function topCounts(values: string[], limit: number): { name: string; count: number }[] {
	const counts = new Map<string, number>()
	for (const value of values) {
		counts.set(value, (counts.get(value) ?? 0) + 1)
	}
	return [...counts.entries()]
		.sort((a, b) => b[1] - a[1])
		.slice(0, limit)
		.map(([name, count]) => ({ name, count }))
}

/** Groups scored entries by `key(entry)` (skipping entries with no key or score),
 *  returning per-group `avgCategoryRating`s. */
function groupScoresByKey(
	entries: TastingEntry[],
	key: (entry: TastingEntry) => string | undefined
): Map<string, number[]> {
	const groups = new Map<string, number[]>()
	for (const entry of entries) {
		if (entry.avgCategoryRating === undefined) continue
		const name = key(entry)
		if (name === undefined) continue
		const scores = groups.get(name) ?? []
		scores.push(entry.avgCategoryRating)
		groups.set(name, scores)
	}
	return groups
}

/** Per-group average `avgCategoryRating`, filtered to `MIN_GROUP_SIZE`+ and sorted by
 *  score descending — for "best X" claims where a single lucky pour shouldn't count. */
function topRatedGroups(
	entries: TastingEntry[],
	key: (entry: TastingEntry) => string | undefined,
	limit: number
): { name: string; avgScore: number; count: number }[] {
	return [...groupScoresByKey(entries, key).entries()]
		.filter(([, scores]) => scores.length >= MIN_GROUP_SIZE)
		.map(([name, scores]) => ({ name, avgScore: mean(scores) as number, count: scores.length }))
		.sort((a, b) => b.avgScore - a.avgScore)
		.slice(0, limit)
}

/** Per-group average `avgCategoryRating` for every group with at least one scored
 *  pour, sorted by pour count descending — feeds radar/radial charts, where the goal
 *  is a representative shape across your most-brewed groups, not a "best of" ranking. */
function radarGroups(
	entries: TastingEntry[],
	key: (entry: TastingEntry) => string | undefined,
	limit: number
): { name: string; avgScore: number; count: number }[] {
	return [...groupScoresByKey(entries, key).entries()]
		.map(([name, scores]) => ({ name, avgScore: mean(scores) as number, count: scores.length }))
		.sort((a, b) => b.count - a.count)
		.slice(0, limit)
}

/** Mean across every value returned by any of `accessors` on every entry that has
 *  notes — used to average a category's two sub-rating fields into one number. */
function categoryMean(
	entries: TastingEntry[],
	accessors: ((notes: TastingNotes) => number | undefined)[]
): number | null {
	const values: number[] = []
	for (const entry of entries) {
		if (!entry.notes) continue
		for (const accessor of accessors) {
			const value = accessor(entry.notes)
			if (value !== undefined) values.push(value)
		}
	}
	return mean(values)
}

export function computeDashboardStats(entries: TastingEntry[]): DashboardStats {
	const roastLevels: number[] = []
	const flavorNotes: string[] = []
	const roastVsRating: { roastLevel: number; rating: number }[] = []
	const locationCounts = new Map<string, number>()

	for (const entry of entries) {
		const details = entry.details
		if (details?.roastLevel !== undefined) roastLevels.push(details.roastLevel)
		if (details?.roasterNotes) flavorNotes.push(...details.roasterNotes)
		if (details?.roastLevel !== undefined && entry.avgCategoryRating !== undefined) {
			roastVsRating.push({ roastLevel: details.roastLevel, rating: entry.avgCategoryRating })
		}
		if (details?.location) {
			const label = details.location === 'home' ? 'Home' : 'Out and about'
			locationCounts.set(label, (locationCounts.get(label) ?? 0) + 1)
		}
	}

	const scoredEntries = entries
		.filter(
			(entry): entry is TastingEntry & { avgCategoryRating: number } =>
				entry.avgCategoryRating !== undefined
		)
		.sort((a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0))

	const midpoint = Math.floor(scoredEntries.length / 2)
	const firstHalf = scoredEntries.slice(0, midpoint)
	const secondHalf = scoredEntries.slice(midpoint)
	const firstHalfAvg = mean(firstHalf.map((e) => e.avgCategoryRating))
	const secondHalfAvg = mean(secondHalf.map((e) => e.avgCategoryRating))
	const avgCategoryRatingTrend =
		firstHalf.length > 0 && secondHalf.length > 0 && firstHalfAvg !== null && secondHalfAvg !== null
			? secondHalfAvg - firstHalfAvg
			: null

	const personalBestEntry = scoredEntries.reduce<TastingEntry | null>(
		(best, entry) =>
			best === null || (entry.avgCategoryRating ?? 0) > (best.avgCategoryRating ?? 0)
				? entry
				: best,
		null
	)

	return {
		totalPours: entries.length,
		avgCategoryRating: mean(scoredEntries.map((e) => e.avgCategoryRating)),
		avgCategoryRatingTrend,
		avgRoastLevel: mean(roastLevels),
		topFlavorNotes: topCounts(flavorNotes, 5),
		bestBrewMethod: topRatedGroups(entries, (e) => e.details?.brewMethod, 1)[0] ?? null,
		bestRoastBand:
			topRatedGroups(
				entries,
				(e) => (e.details?.roastLevel !== undefined ? roastBand(e.details.roastLevel) : undefined),
				1
			)[0] ?? null,
		regionScores: radarGroups(entries, (e) => e.details?.region, 8),
		roasterScores: radarGroups(entries, (e) => e.details?.producer, 8),
		ratingsByCategory: [
			{
				category: 'Aroma',
				value: categoryMean(entries, [(n) => n.aromaIntensity, (n) => n.aromaClarity])
			},
			{
				category: 'Flavor',
				value: categoryMean(entries, [(n) => n.flavorComplexity, (n) => n.flavorSweetness])
			},
			{
				category: 'Acidity',
				value: categoryMean(entries, [(n) => n.acidityIntensity, (n) => n.acidityQuality])
			},
			{
				category: 'Body',
				value: categoryMean(entries, [(n) => n.bodyWeight, (n) => n.bodyTactile])
			},
			{
				category: 'Finish',
				value: categoryMean(entries, [(n) => n.finishFlavor, (n) => n.finishLength])
			}
		],
		roastVsRating,
		locationSplit: [...locationCounts.entries()].map(([location, count]) => ({ location, count })),
		personalBest: personalBestEntry
			? {
					score: personalBestEntry.avgCategoryRating as number,
					roaster: personalBestEntry.details?.producer ?? null,
					region: personalBestEntry.details?.region ?? null,
					date: personalBestEntry.createdAt.slice(0, 10)
				}
			: null
	}
}
