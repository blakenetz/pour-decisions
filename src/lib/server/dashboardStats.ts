import type { TastingEntry } from '../types/tasting'

export interface DashboardStats {
	totalPours: number
	/** Mean of every scored pour's `overallScore`. */
	overallScore: number | null
	/** Delta between the second half and first half of scored pours (chronological). */
	scoreTrend: number | null
	ratingsByCategory: { category: string; value: number | null }[]
	avgRoastLevel: number | null
	poursByMonth: { month: string; count: number }[]
	scoreByMonth: { month: string; avgScore: number }[]
	topFlavorNotes: { name: string; count: number }[]
	bestBrewMethod: { name: string; avgScore: number; count: number } | null
	bestRoastBand: { name: string; avgScore: number; count: number } | null
	/** Avg score per region, top 8 by pour count — feeds the region radar chart. */
	regionScores: { name: string; avgScore: number; count: number }[]
	/** Avg score per roaster, top 8 by pour count — feeds the roaster radar chart. */
	roasterScores: { name: string; avgScore: number; count: number }[]
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
 *  returning per-group `overallScore`s. */
function groupScoresByKey(
	entries: TastingEntry[],
	key: (entry: TastingEntry) => string | undefined
): Map<string, number[]> {
	const groups = new Map<string, number[]>()
	for (const entry of entries) {
		if (entry.overallScore === undefined) continue
		const name = key(entry)
		if (name === undefined) continue
		const scores = groups.get(name) ?? []
		scores.push(entry.overallScore)
		groups.set(name, scores)
	}
	return groups
}

/** Per-group average `overallScore`, filtered to `MIN_GROUP_SIZE`+ and sorted by score
 *  descending — for "best X" claims where a single lucky pour shouldn't count. */
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

/** Per-group average `overallScore` for every group with at least one scored pour,
 *  sorted by pour count descending — feeds radar/radial charts, where the goal is a
 *  representative shape across your most-brewed groups, not a "best of" ranking. */
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

export function computeDashboardStats(entries: TastingEntry[]): DashboardStats {
	const aroma: number[] = []
	const flavor: number[] = []
	const acidity: number[] = []
	const body: number[] = []
	const finish: number[] = []
	const roastLevels: number[] = []
	const flavorNotes: string[] = []
	const monthCounts = new Map<string, number>()
	const monthScores = new Map<string, number[]>()

	for (const entry of entries) {
		const notes = entry.notes
		if (notes?.aromaIntensity !== undefined) aroma.push(notes.aromaIntensity)
		if (notes?.aromaClarity !== undefined) aroma.push(notes.aromaClarity)
		if (notes?.flavorComplexity !== undefined) flavor.push(notes.flavorComplexity)
		if (notes?.flavorSweetness !== undefined) flavor.push(notes.flavorSweetness)
		if (notes?.acidityIntensity !== undefined) acidity.push(notes.acidityIntensity)
		if (notes?.acidityQuality !== undefined) acidity.push(notes.acidityQuality)
		if (notes?.bodyWeight !== undefined) body.push(notes.bodyWeight)
		if (notes?.bodyTactile !== undefined) body.push(notes.bodyTactile)
		if (notes?.finishFlavor !== undefined) finish.push(notes.finishFlavor)
		if (notes?.finishLength !== undefined) finish.push(notes.finishLength)

		const details = entry.details
		if (details?.roastLevel !== undefined) roastLevels.push(details.roastLevel)
		if (details?.roasterNotes) flavorNotes.push(...details.roasterNotes)

		const month = entry.createdAt.slice(0, 7)
		monthCounts.set(month, (monthCounts.get(month) ?? 0) + 1)
		if (entry.overallScore !== undefined) {
			const scores = monthScores.get(month) ?? []
			scores.push(entry.overallScore)
			monthScores.set(month, scores)
		}
	}

	const poursByMonth = [...monthCounts.entries()]
		.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
		.map(([month, count]) => ({ month, count }))

	const scoreByMonth = [...monthScores.entries()]
		.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
		.map(([month, scores]) => ({ month, avgScore: mean(scores) as number }))

	const scoredEntries = entries
		.filter(
			(entry): entry is TastingEntry & { overallScore: number } => entry.overallScore !== undefined
		)
		.sort((a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0))

	const midpoint = Math.floor(scoredEntries.length / 2)
	const firstHalf = scoredEntries.slice(0, midpoint)
	const secondHalf = scoredEntries.slice(midpoint)
	const firstHalfAvg = mean(firstHalf.map((e) => e.overallScore))
	const secondHalfAvg = mean(secondHalf.map((e) => e.overallScore))
	const scoreTrend =
		firstHalf.length > 0 && secondHalf.length > 0 && firstHalfAvg !== null && secondHalfAvg !== null
			? secondHalfAvg - firstHalfAvg
			: null

	const personalBestEntry = scoredEntries.reduce<TastingEntry | null>(
		(best, entry) =>
			best === null || (entry.overallScore ?? 0) > (best.overallScore ?? 0) ? entry : best,
		null
	)

	return {
		totalPours: entries.length,
		overallScore: mean(scoredEntries.map((e) => e.overallScore)),
		scoreTrend,
		ratingsByCategory: [
			{ category: 'Aroma', value: mean(aroma) },
			{ category: 'Flavor', value: mean(flavor) },
			{ category: 'Acidity', value: mean(acidity) },
			{ category: 'Body', value: mean(body) },
			{ category: 'Finish', value: mean(finish) }
		],
		avgRoastLevel: mean(roastLevels),
		poursByMonth,
		scoreByMonth,
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
		personalBest: personalBestEntry
			? {
					score: personalBestEntry.overallScore as number,
					roaster: personalBestEntry.details?.producer ?? null,
					region: personalBestEntry.details?.region ?? null,
					date: personalBestEntry.createdAt.slice(0, 10)
				}
			: null
	}
}
