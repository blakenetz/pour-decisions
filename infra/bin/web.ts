#!/usr/bin/env node
/**
 * Web environments (CloudFront + Lambda + S3), deployed by GitHub Actions on every PR (dev) and
 * every push to main (prod). Kept apart from bin/infra.ts so deploys never synthesize, need the
 * secrets of, or touch the Cognito/DynamoDB stack.
 *
 *   pnpm run web:deploy -c env=dev
 *
 * Expects `pnpm build && pnpm package:lambda` to have run at the repo root first.
 */
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { App } from 'aws-cdk-lib'
import { account, type DeployEnvironment, data, deployEnvironments, region } from '../lib/config'
import { WebStack } from '../lib/web-stack'

const app = new App()

const environment = app.node.tryGetContext('env') as DeployEnvironment | undefined
if (!environment || !deployEnvironments.includes(environment)) {
	throw new Error(`Pass the target environment: -c env=<${deployEnvironments.join('|')}>`)
}

// cdk runs with cwd = infra/, so the repo root is one level up.
const lambdaDir = resolve('../.lambda')
const clientDir = resolve('../build/client')
for (const dir of [lambdaDir, clientDir]) {
	if (!existsSync(dir)) {
		throw new Error(`${dir} is missing; run 'pnpm build && pnpm package:lambda' at the repo root`)
	}
}

// The GitHub OAuth app is per environment (GitHub allows one callback URL per OAuth app). Its
// credentials come from the GitHub Actions environment's secrets (GitHub reserves the GITHUB_
// prefix there, hence GH_). Without them GitHub sign-in is disabled in that environment.
const githubOAuth: Record<string, string> = {}
if (process.env.GH_OAUTH_CLIENT_ID && process.env.GH_OAUTH_CLIENT_SECRET) {
	githubOAuth.GITHUB_CLIENT_ID = process.env.GH_OAUTH_CLIENT_ID
	githubOAuth.GITHUB_CLIENT_SECRET = process.env.GH_OAUTH_CLIENT_SECRET
}

new WebStack(app, `PourDecisionsWeb-${environment}`, {
	env: { account, region },
	environment,
	lambdaDir,
	clientDir,
	tableName: data.tableName,
	settingsTableName: data.settingsTableName,
	userPoolId: data.userPoolId,
	appEnv: {
		PUBLIC_AWS_REGION: region,
		PUBLIC_COGNITO_USER_POOL_ID: data.userPoolId,
		PUBLIC_COGNITO_USER_POOL_CLIENT_ID: data.userPoolClientId,
		PUBLIC_COGNITO_DOMAIN: data.cognitoDomain,
		PUBLIC_OAUTH_SCOPES: 'email,openid,profile',
		DYNAMODB_TABLE: data.tableName,
		DYNAMODB_SETTINGS_TABLE: data.settingsTableName,
		...githubOAuth
	}
})
