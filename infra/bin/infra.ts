#!/usr/bin/env node
import { App } from 'aws-cdk-lib'
import { CiStack } from '../lib/ci-stack'
import {
	account,
	data,
	githubDeployRoleName,
	githubE2eRoleName,
	githubRepo,
	googleClientId,
	region,
	webOrigins
} from '../lib/config'
import { DataStack } from '../lib/data-stack'
import { PourDecisionsStack } from '../lib/pour-decisions-stack'

// Reuse the root app's .env instead of duplicating secrets into infra/. `cdk synth`/`cdk import`
// run with cwd = infra/ (where cdk.json lives), so '../.env' resolves to the repo root .env.
process.loadEnvFile('../.env')

const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET
const githubClientSecret = process.env.GITHUB_CLIENT_SECRET

if (!googleClientSecret) {
	throw new Error('GOOGLE_CLIENT_SECRET is missing from the root .env file')
}
if (!githubClientSecret) {
	throw new Error('GITHUB_CLIENT_SECRET is missing from the root .env file')
}

const app = new App()

new PourDecisionsStack(app, 'PourDecisionsStack', {
	env: { account, region },
	googleClientSecret,
	githubClientSecret,
	// Only production's own origin: localhost and PR deploys sign in through the dev pool.
	appOrigins: [webOrigins.prod]
})

new CiStack(app, 'PourDecisionsCiStack', {
	env: { account, region },
	githubRepo,
	roleName: githubDeployRoleName,
	e2eRoleName: githubE2eRoleName
})

new DataStack(app, 'PourDecisionsData-dev', {
	env: { account, region },
	environment: 'dev',
	data: data.dev,
	appOrigins: ['http://localhost:8008', webOrigins.dev],
	googleClientId,
	googleClientSecret
})
