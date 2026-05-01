import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'
import { env } from '$env/dynamic/private'
import { env as publicEnv } from '$env/dynamic/public'

const client = new DynamoDBClient({ region: publicEnv.PUBLIC_AWS_REGION || 'us-west-1' })

export const db = DynamoDBDocumentClient.from(client)

export function getTableName(): string {
	const table = env.DYNAMODB_TABLE
	if (!table) throw new Error('DYNAMODB_TABLE is not configured')
	return table
}
