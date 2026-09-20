import type { TastingEntry } from '../types/tasting'

export interface DashboardStats {
	totalPours: number
	avgRatings: {
		aroma: number | null
		flavor: number | null
		acidity: number | null
		body: number | null
		finish: number | null
	}
	avgRoastLevel: number | null
	topRoasters: { name: string; count: number }[]
	topRegions: { name: string; count: number }[]
	poursByMonth: { month: string; count: number }[]
}

function mean(values: number[]): number | null {
	if (values.length === 0) return null
	return values.reduce((sum, v) => sum + v, 0) / values.length
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

export function computeDashboardStats(entries: TastingEntry[]): DashboardStats {
	const aroma: number[] = []
	const flavor: number[] = []
	const acidity: number[] = []
	const body: number[] = []
	const finish: number[] = []
	const roastLevels: number[] = []
	const roasters: string[] = []
	const regions: string[] = []
	const monthCounts = new Map<string, number>()

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
		if (details?.producer !== undefined) roasters.push(details.producer)
		if (details?.region !== undefined) regions.push(details.region)

		const month = entry.createdAt.slice(0, 7)
		monthCounts.set(month, (monthCounts.get(month) ?? 0) + 1)
	}

	const poursByMonth = [...monthCounts.entries()]
		.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
		.map(([month, count]) => ({ month, count }))

	return {
		totalPours: entries.length,
		avgRatings: {
			aroma: mean(aroma),
			flavor: mean(flavor),
			acidity: mean(acidity),
			body: mean(body),
			finish: mean(finish)
		},
		avgRoastLevel: mean(roastLevels),
		topRoasters: topCounts(roasters, 3),
		topRegions: topCounts(regions, 3),
		poursByMonth
	}
}
