#!/usr/bin/env node
import { App } from 'aws-cdk-lib'
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
	env: { account: '187864192245', region: 'us-west-1' },
	googleClientSecret,
	githubClientSecret
})
