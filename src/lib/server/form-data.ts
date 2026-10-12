/** Trimmed string field, or `undefined` when missing or blank. */
export function formString(data: FormData, key: string): string | undefined {
	return data.get(key)?.toString().trim() || undefined
}

/** Numeric field, or `undefined` when missing, blank, zero, or not a number. */
export function formNumber(data: FormData, key: string): number | undefined {
	return Number(data.get(key)) || undefined
}
