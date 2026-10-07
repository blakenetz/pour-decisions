#!/usr/bin/env node
import { App } from 'aws-cdk-lib'
import { CiStack } from '../lib/ci-stack'
import { account, githubDeployRoleName, githubRepo, region, webOrigins } from '../lib/config'
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
	appOrigins: ['http://localhost:8008', ...Object.values(webOrigins)]
})

new CiStack(app, 'PourDecisionsCiStack', {
	env: { account, region },
	githubRepo,
	roleName: githubDeployRoleName
})
