import { QueryCommand } from '@aws-sdk/lib-dynamodb'
import { fail, redirect } from '@sveltejs/kit'
import { db, getTableName } from '$lib/server/db'
import { formNumber, formString } from '$lib/server/form-data'
import { getPourDefaults, savePourDefaults } from '$lib/server/settings'
import { pourDefaultsSchema } from '$lib/types/tasting'
import type { Actions, PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user
	if (!user) redirect(302, '/')

	const [result, defaults] = await Promise.all([
		// Select — not the fuller Query already run on /dashboard — since this page
		// only needs a count, not the fact table.
		db.send(
			new QueryCommand({
				TableName: getTableName(),
				KeyConditionExpression: 'userId = :userId',
				ExpressionAttributeValues: { ':userId': user.userId },
				Select: 'COUNT'
			})
		),
		getPourDefaults(user.userId)
	])

	return { user, pourCount: result.Count ?? 0, defaults }
}

export const actions: Actions = {
	saveDefaults: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { error: 'Unauthorized' })

		const data = await request.formData()
		// Blank fields mean "no default", so saving an empty form clears them all.
		const parsed = pourDefaultsSchema.safeParse({
			brewMethod: formString(data, 'brewMethod'),
			grindSize: formString(data, 'grindSize'),
			grinder: formString(data, 'grinder'),
			grindSetting: formNumber(data, 'grindSetting'),
			coffeeGrams: formNumber(data, 'coffeeGrams'),
			waterGrams: formNumber(data, 'waterGrams'),
			waterTempF: formNumber(data, 'waterTempF'),
			brewTimeSeconds: formNumber(data, 'brewTimeSeconds'),
			location: formString(data, 'location')
		})
		if (!parsed.success) {
			return fail(400, { error: parsed.error.issues[0].message })
		}

		await savePourDefaults(locals.user.userId, parsed.data)
		return { saved: true }
	}
}
