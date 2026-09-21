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

	// Slim per-pour projection for the client-side drill-down explorer — omits brew
	// parameters and free-text notes the table doesn't display.
	const pours = entries
		.map((entry) => ({
			entryId: entry.entryId,
			date: entry.createdAt.slice(0, 10),
			roaster: entry.details?.producer ?? null,
			region: entry.details?.region ?? null,
			brewMethod: entry.details?.brewMethod ?? null,
			location:
				entry.details?.location === 'out'
					? (entry.details.locationName ?? 'Out and about')
					: entry.details?.location === 'home'
						? 'Home'
						: null,
			overallRating: entry.notes?.overallRating ?? null,
			avgCategoryRating: entry.avgCategoryRating ?? null
		}))
		.sort((a, b) => (b.overallRating ?? -1) - (a.overallRating ?? -1))

	return { user, pourCount: entries.length, stats: computeDashboardStats(entries), pours }
}
