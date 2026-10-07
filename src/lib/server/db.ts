import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'
import { env } from '$env/dynamic/private'
import { env as publicEnv } from '$env/dynamic/public'

const client = new DynamoDBClient({ region: publicEnv.PUBLIC_AWS_REGION || 'us-west-1' })

// zod's `.optional()` fields land in parsed output as keys explicitly set to
// `undefined` (not omitted) when unfilled — the AWS SDK otherwise throws
// ("Pass options.removeUndefinedValues=true...") rather than skip them.
export const db = DynamoDBDocumentClient.from(client, {
	marshallOptions: { removeUndefinedValues: true }
})

export function getTableName(): string {
	const table = env.DYNAMODB_TABLE
	if (!table) throw new Error('DYNAMODB_TABLE is not configured')
	return table
}
