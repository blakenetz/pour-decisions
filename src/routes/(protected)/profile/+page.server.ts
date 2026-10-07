import { QueryCommand } from '@aws-sdk/lib-dynamodb'
import { redirect } from '@sveltejs/kit'
import { db, getTableName } from '$lib/server/db'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user
	if (!user) redirect(302, '/')

	// Select — not the fuller Query already run on /dashboard — since this page
	// only needs a count, not the fact table.
	const result = await db.send(
		new QueryCommand({
			TableName: getTableName(),
			KeyConditionExpression: 'userId = :userId',
			ExpressionAttributeValues: { ':userId': user.userId },
			Select: 'COUNT'
		})
	)

	return { user, pourCount: result.Count ?? 0 }
}
