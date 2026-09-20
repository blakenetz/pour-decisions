import { QueryCommand } from '@aws-sdk/lib-dynamodb'
import { redirect } from '@sveltejs/kit'
import { computeDashboardStats } from '$lib/server/dashboardStats'
import { db, getTableName } from '$lib/server/db'
import type { TastingEntry } from '$lib/types/tasting'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user
	if (!user) redirect(302, '/')

	const result = await db.send(
		new QueryCommand({
			TableName: getTableName(),
			KeyConditionExpression: 'userId = :userId',
			ExpressionAttributeValues: { ':userId': user.userId }
		})
	)
	const entries = (result.Items ?? []) as TastingEntry[]

	return { user, pourCount: entries.length, stats: computeDashboardStats(entries) }
}
