import { GRIND_SIZES, type GrindSize } from './coffee'

export interface Grinder {
	name: string
	/** Compact label for tables, e.g. "Encore 14". */
	shortName: string
	/** Dial range and the size of one step, in the grinder's own units. */
	min: number
	max: number
	step: number
	/**
	 * Highest setting that still falls in each {@link GRIND_SIZES} band, fine → coarse (the last
	 * entry is `max`). Grinder numbers aren't comparable across grinders, so every pour's setting
	 * is also filed under one of these shared bands; that keeps the dashboard's fine → coarse axis
	 * and "best grind" findings working whatever grinder a pour used.
	 */
	bandUpperBounds: readonly [number, number, number, number, number, number, number]
}

/**
 * Grinders whose dial settings can be logged exactly. Adding one is a single entry.
 *
 * Band bounds are derived from approximate particle size: DABOV's grind-size calculator models
 * each grinder as a straight line from setting to microns
 * (https://dabov.us/tools/grind-size-calculator), and the bands are cut at the micron sizes that
 * match how this app already files brew methods (espresso = Extra Fine, AeroPress/moka = Fine,
 * pour over = Medium-Fine, drip = Medium, Chemex = Medium-Coarse, French press = Coarse,
 * cold brew = Extra Coarse): 350 / 450 / 600 / 700 / 850 / 1100 µm.
 */
export const GRINDERS = {
	// ≈ 100 + 35 µm per step (DABOV: 400–700 µm ↔ settings 8.6–17.1).
	'baratza-encore': {
		name: 'Baratza Encore',
		shortName: 'Encore',
		min: 1,
		max: 40,
		step: 1,
		bandUpperBounds: [7, 10, 14, 17, 21, 28, 40]
	}
} as const satisfies Record<string, Grinder>

export type GrinderId = keyof typeof GRINDERS

export const GRINDER_IDS = Object.keys(GRINDERS) as [GrinderId, ...GrinderId[]]

/** The shared fine → coarse band a grinder setting falls in. */
export function grindBand(grinderId: GrinderId, setting: number): GrindSize {
	const bounds: readonly number[] = GRINDERS[grinderId].bandUpperBounds
	const index = bounds.findIndex((upper) => setting <= upper)
	return GRIND_SIZES[index === -1 ? GRIND_SIZES.length - 1 : index]
}
