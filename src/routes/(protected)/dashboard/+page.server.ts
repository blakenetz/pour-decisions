import { QueryCommand } from '@aws-sdk/lib-dynamodb'
import { redirect } from '@sveltejs/kit'
import { toPourFact } from '$lib/dashboard/analysis'
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

	// The flattened fact table is the entire dashboard payload: every chart,
	// filter and finding is derived from it on the client, so drilling down never
	// costs a round trip. Sorted oldest-first so trend lines need no re-sorting.
	const pours = entries.map(toPourFact).sort((a, b) => (a.date < b.date ? -1 : 1))

	return { user, pours }
}
