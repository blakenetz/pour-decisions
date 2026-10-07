import {
	DIMENSIONS,
	type DimensionId,
	type Filters,
	groupBy,
	METRICS,
	MIN_CONFIDENT_GROUP,
	type PourFact
} from './analysis'

export interface Finding {
	/** Stable key for list rendering. */
	id: string
	/** Human sentence, e.g. "Light roasts beat Dark for Ethiopia". */
	headline: string
	detail: string
	/** Difference in quality points between the best and worst group. */
	effect: number
	/** The drill-down that shows this finding — clicking a finding applies it. */
	filters: Filters
	/** Dimension to break down by once the filters are applied. */
	breakdown: DimensionId
}

interface Contrast {
	best: { name: string; value: number; count: number }
	worst: { name: string; value: number; count: number }
}

/** Best and worst group on `dimension`, ignoring groups too small to trust. */
function contrast(facts: PourFact[], dimension: DimensionId): Contrast | null {
	const groups = groupBy(facts, DIMENSIONS[dimension], METRICS.quality).filter(
		(group): group is { name: string; value: number; count: number } =>
			group.value !== null && group.count >= MIN_CONFIDENT_GROUP
	)
	if (groups.length < 2) return null

	const sorted = [...groups].sort((a, b) => b.value - a.value)
	return { best: sorted[0], worst: sorted[sorted.length - 1] }
}

/** Effect below this is noise dressed up as insight — roughly a tenth of the
 *  1–5 quality scale. */
const MIN_EFFECT = 0.25

/**
 * Scans the fact table for the largest real differences in quality and phrases
 * them as sentences, strongest first.
 *
 * Two passes: whole-collection contrasts ("Pour Over beats French Press"), then
 * within-origin roast contrasts ("for Ethiopia, Light beats Dark") — the second
 * is what makes an origin-specific preference visible at all, since averaging
 * across every origin cancels opposing preferences out.
 */
export function findInsights(facts: PourFact[], limit = 4): Finding[] {
	const findings: Finding[] = []
	// Grind is deliberately absent here: the right grind for espresso is the wrong
	// grind for cold brew, so a collection-wide grind ranking just restates which
	// methods you brew most. It's only meaningful inside a method — see below.
	for (const id of ['brewMethod', 'process', 'roastBand', 'roaster'] as const) {
		const result = contrast(facts, id)
		if (!result) continue
		const effect = result.best.value - result.worst.value
		if (effect < MIN_EFFECT) continue

		findings.push({
			id: `overall-${id}`,
			headline: `${result.best.name} is your best ${DIMENSIONS[id].label.toLowerCase()}`,
			detail: `${result.best.name} averages ${result.best.value.toFixed(2)} quality across ${result.best.count} pours, versus ${result.worst.value.toFixed(2)} for ${result.worst.name}.`,
			effect,
			filters: {},
			breakdown: id
		})
	}

	// Roast preference per origin — the contrast that only exists inside a slice.
	const countries = new Set(facts.map((fact) => fact.country).filter(Boolean) as string[])
	for (const country of countries) {
		const slice = facts.filter((fact) => fact.country === country)
		if (slice.length < MIN_CONFIDENT_GROUP * 2) continue
		const result = contrast(slice, 'roastBand')
		if (!result) continue
		const effect = result.best.value - result.worst.value
		if (effect < MIN_EFFECT) continue

		findings.push({
			id: `roast-${country}`,
			headline: `For ${country}, you prefer ${result.best.name.toLowerCase()} roasts`,
			detail: `${result.best.name} ${country} averages ${result.best.value.toFixed(2)} across ${result.best.count} pours, versus ${result.worst.value.toFixed(2)} for ${result.worst.name.toLowerCase()}.`,
			effect,
			filters: { country },
			breakdown: 'roastBand'
		})
	}

	// Grind preference per brew method — likewise only visible within a method,
	// since the right grind for espresso is the wrong grind for French press.
	const methods = new Set(facts.map((fact) => fact.brewMethod).filter(Boolean) as string[])
	for (const method of methods) {
		const slice = facts.filter((fact) => fact.brewMethod === method)
		if (slice.length < MIN_CONFIDENT_GROUP * 2) continue
		const result = contrast(slice, 'grindSize')
		if (!result) continue
		const effect = result.best.value - result.worst.value
		if (effect < MIN_EFFECT) continue

		findings.push({
			id: `grind-${method}`,
			headline: `${method} works best at ${result.best.name.toLowerCase()} grind`,
			detail: `${result.best.name} averages ${result.best.value.toFixed(2)} across ${result.best.count} ${method.toLowerCase()} pours, versus ${result.worst.value.toFixed(2)} at ${result.worst.name.toLowerCase()}.`,
			effect,
			filters: { brewMethod: method },
			breakdown: 'grindSize'
		})
	}

	return findings.sort((a, b) => b.effect - a.effect).slice(0, limit)
}
