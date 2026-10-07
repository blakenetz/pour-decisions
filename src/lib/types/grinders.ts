import { GRIND_SIZES, type GrindSize } from './coffee'

/** One position on a grinder's dial: the label the taster reads, and where it sits on the dial. */
export interface DialPosition {
	label: string
	/** Numeric position for interpolation, e.g. Fellow Ode "4.2" (two marks past 4) → 4.667. */
	position: number
}

export interface Grinder {
	name: string
	/** Compact label for tables, e.g. "Encore". */
	shortName: string
	/** What the dial counts: a numbered setting, or clicks from fully closed burrs. */
	unit: 'Setting' | 'Clicks'
	/** Every selectable position, finest → coarsest. */
	positions: readonly DialPosition[]
	/**
	 * Approximate particle size along the dial as `[position, µm]` points, finest → coarsest;
	 * sizes between points are interpolated linearly. Most dials are linear (two points);
	 * some, like the Encore ESP's fine espresso half, need more.
	 */
	microns: readonly (readonly [number, number])[]
}

/** Whole-number positions `min`…`max`. */
function numbered(min: number, max: number): DialPosition[] {
	return Array.from({ length: max - min + 1 }, (_, i) => ({
		label: String(min + i),
		position: min + i
	}))
}

/** Numbered dial with `marks` unlabeled marks between numbers, written "4", "4.1", "4.2", "5". */
function subdivided(min: number, max: number, marks: number): DialPosition[] {
	const positions: DialPosition[] = []
	for (let n = min; n <= max; n++) {
		positions.push({ label: String(n), position: n })
		if (n === max) break
		for (let m = 1; m <= marks; m++) {
			positions.push({ label: `${n}.${m}`, position: n + m / (marks + 1) })
		}
	}
	return positions
}

/**
 * Grinders whose dial settings can be logged exactly. Dial ranges and micron sizes come from
 * Honest Coffee Guide's per-grinder grind size charts
 * (https://honestcoffeeguide.com/coffee-grind-size-chart/), read off each chart's setting axis.
 *
 * Only dials with a single number per position are listed. Compound dials (1Zpresso's
 * rotation.number.click, Eureka's "3+2", Baratza Vario's macro letter + micro) and stepless
 * grinders (Niche Zero) need a different setting input and aren't supported yet.
 */
export const GRINDERS = {
	'baratza-encore': {
		name: 'Baratza Encore',
		shortName: 'Encore',
		unit: 'Setting',
		positions: numbered(0, 40),
		microns: [
			[0, 250],
			[40, 1200]
		]
	},
	'baratza-encore-esp': {
		name: 'Baratza Encore ESP',
		shortName: 'Encore ESP',
		unit: 'Setting',
		positions: numbered(0, 40),
		// 0–20 is the fine espresso range in small steps; 20–40 covers filter in large ones.
		microns: [
			[0, 230],
			[20, 460],
			[40, 1380]
		]
	},
	'baratza-virtuoso-plus': {
		name: 'Baratza Virtuoso+',
		shortName: 'Virtuoso+',
		unit: 'Setting',
		positions: numbered(0, 40),
		microns: [
			[0, 200],
			[40, 1200]
		]
	},
	'breville-smart-grinder-pro': {
		name: 'Breville / Sage Smart Grinder Pro',
		shortName: 'Smart Grinder Pro',
		unit: 'Setting',
		positions: numbered(1, 60),
		microns: [
			[1, 200],
			[60, 820]
		]
	},
	'capresso-infinity': {
		name: 'Capresso Infinity',
		shortName: 'Infinity',
		unit: 'Setting',
		positions: numbered(1, 16),
		microns: [
			[1, 240],
			[16, 1220]
		]
	},
	'comandante-c40-mk4': {
		name: 'Comandante C40 MK4',
		shortName: 'C40',
		unit: 'Clicks',
		positions: numbered(0, 40),
		microns: [
			[0, 0],
			[40, 1090]
		]
	},
	'fellow-ode-gen-2': {
		name: 'Fellow Ode Gen 2',
		shortName: 'Ode',
		unit: 'Setting',
		// 31 settings: 1–11 with two marks between numbers.
		positions: subdivided(1, 11, 2),
		microns: [
			[1, 275],
			[11, 1160]
		]
	},
	'fellow-opus': {
		name: 'Fellow Opus',
		shortName: 'Opus',
		unit: 'Setting',
		// Outer ring only: 1–11 with three marks between numbers. The inner espresso ring isn't
		// captured.
		positions: subdivided(1, 11, 3),
		microns: [
			[1, 230],
			[11, 1160]
		]
	},
	'oxo-conical-burr': {
		name: 'OXO Brew Conical Burr',
		shortName: 'OXO',
		unit: 'Setting',
		positions: numbered(1, 15),
		microns: [
			[1, 195],
			[15, 1100]
		]
	},
	'timemore-c2': {
		name: 'Timemore Chestnut C2',
		shortName: 'C2',
		unit: 'Clicks',
		positions: numbered(0, 30),
		microns: [
			[0, 0],
			[30, 950]
		]
	},
	'timemore-c3': {
		name: 'Timemore Chestnut C3',
		shortName: 'C3',
		unit: 'Clicks',
		positions: numbered(0, 24),
		microns: [
			[0, 0],
			[24, 912]
		]
	},
	'wilfa-svart-aroma': {
		name: 'Wilfa Svart Aroma',
		shortName: 'Svart',
		unit: 'Setting',
		positions: numbered(1, 18),
		microns: [
			[1, 310],
			[18, 1100]
		]
	}
} as const satisfies Record<string, Grinder>

export type GrinderId = keyof typeof GRINDERS

export const GRINDER_IDS = Object.keys(GRINDERS) as [GrinderId, ...GrinderId[]]

/**
 * Upper micron bound of each {@link GRIND_SIZES} band, from Honest Coffee Guide's definitions
 * (200 µm per band: Extra Fine 0–200 … Coarse 1000–1200, Extra Coarse above).
 */
const BAND_UPPER_MICRONS = [200, 400, 600, 800, 1000, 1200] as const

/** The dial position for `label`, or `undefined` if the grinder has no such setting. */
export function dialPosition(grinderId: GrinderId, label: string): DialPosition | undefined {
	return (GRINDERS[grinderId].positions as readonly DialPosition[]).find((p) => p.label === label)
}

/** Approximate particle size (µm) at a dial position, interpolated between calibration points. */
function micronsAt(grinder: Grinder, position: number): number {
	const points = grinder.microns
	for (let i = 1; i < points.length; i++) {
		const [p1, m1] = points[i]
		if (position <= p1 || i === points.length - 1) {
			const [p0, m0] = points[i - 1]
			return m0 + ((position - p0) / (p1 - p0)) * (m1 - m0)
		}
	}
	return points[0][1]
}

/**
 * The shared fine → coarse band a grinder setting falls in. Grinder numbers aren't comparable
 * across grinders, so every pour is also filed under one of these bands; that keeps the
 * dashboard's fine → coarse axis and "best grind" findings working whatever grinder was used.
 */
export function grindBand(grinderId: GrinderId, label: string): GrindSize | undefined {
	const dial = dialPosition(grinderId, label)
	if (!dial) return undefined
	const microns = micronsAt(GRINDERS[grinderId], dial.position)
	const index = BAND_UPPER_MICRONS.findIndex((upper) => microns < upper)
	return GRIND_SIZES[index === -1 ? GRIND_SIZES.length - 1 : index]
}

/** Table label for a logged setting, e.g. "Encore 14" or "C40 24 clicks". */
export function formatGrindSetting(grinderId: GrinderId, label: string): string {
	const { shortName, unit } = GRINDERS[grinderId]
	return unit === 'Clicks' ? `${shortName} ${label} clicks` : `${shortName} ${label}`
}
