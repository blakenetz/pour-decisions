import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb'
import { type PourDefaults, pourDefaultsSchema } from '$lib/types/tasting'
import { db, getSettingsTableName } from './db'

interface UserSettingsItem {
	userId: string
	pourDefaults?: PourDefaults
	updatedAt: string
}

/** The user's saved brew setup, or `{}` when none is saved. */
export async function getPourDefaults(userId: string): Promise<PourDefaults> {
	const result = await db.send(
		new GetCommand({ TableName: getSettingsTableName(), Key: { userId } })
	)
	const item = result.Item as UserSettingsItem | undefined
	// Re-validate on read: a stored value that no longer fits the vocabulary (e.g. a renamed brew
	// method) must not pre-fill the form with an option that doesn't exist.
	const parsed = pourDefaultsSchema.safeParse(item?.pourDefaults ?? {})
	return parsed.success ? parsed.data : {}
}

export async function savePourDefaults(userId: string, pourDefaults: PourDefaults): Promise<void> {
	const item: UserSettingsItem = { userId, pourDefaults, updatedAt: new Date().toISOString() }
	await db.send(new PutCommand({ TableName: getSettingsTableName(), Item: item }))
}
