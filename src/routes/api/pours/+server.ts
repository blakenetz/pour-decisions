import { PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb'
import { error, json } from '@sveltejs/kit'
import { ulid } from 'ulid'
import { getUserIdFromRequest } from '$lib/server/auth'
import { db, getTableName } from '$lib/server/db'
import { createTastingInputSchema, type TastingEntry } from '$lib/types/tasting'
import type { RequestHandler } from './$types'

export const GET: RequestHandler = async ({ request }) => {
	let userId: string
	try {
		userId = await getUserIdFromRequest(request)
	} catch {
		error(401, 'Unauthorized')
	}

	const result = await db.send(
		new QueryCommand({
			TableName: getTableName(),
			KeyConditionExpression: 'userId = :userId',
			ExpressionAttributeValues: { ':userId': userId }
		})
	)

	return json(result.Items ?? [])
}

export const POST: RequestHandler = async ({ request }) => {
	let userId: string
	try {
		userId = await getUserIdFromRequest(request)
	} catch {
		error(401, 'Unauthorized')
	}

	let body: unknown
	try {
		body = await request.json()
	} catch {
		error(400, 'Invalid JSON')
	}

	const parsed = createTastingInputSchema.safeParse(body)
	if (!parsed.success) {
		error(400, parsed.error.issues[0].message)
	}

	const entry: TastingEntry = {
		userId,
		entryId: ulid(),
		createdAt: new Date().toISOString(),
		...parsed.data
	}

	await db.send(
		new PutCommand({
			TableName: getTableName(),
			Item: entry
		})
	)

	return json(entry, { status: 201 })
}
