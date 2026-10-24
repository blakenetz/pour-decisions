import { Duration, Stack, type StackProps } from 'aws-cdk-lib'
import {
	OidcProviderNative,
	PolicyStatement,
	Role,
	WebIdentityPrincipal
} from 'aws-cdk-lib/aws-iam'
import type { Construct } from 'constructs'
import { data, deployEnvironments } from './config'

export interface CiStackProps extends StackProps {
	/** `owner/name` of the repository whose workflows may deploy. */
	readonly githubRepo: string
	readonly roleName: string
	/** Role the pull-request e2e run assumes to seed its test accounts. */
	readonly e2eRoleName: string
}

/**
 * Lets GitHub Actions deploy the web stacks without long-lived AWS keys: workflows exchange their
 * OIDC token for this role, which can only assume the CDK bootstrap roles (the same path a local
 * `cdk deploy` takes).
 *
 * Trust is limited to jobs running in this repo's `dev` / `prod` GitHub environments. The `prod`
 * environment only accepts deployments from `main` (GitHub environment branch policy), and pull
 * requests from forks never receive an OIDC token for these environments.
 *
 * A second, narrower role lets the pull-request e2e run seed its test accounts: only `dev` jobs
 * may assume it, and it can only read, write and delete items in dev's tastings table.
 */
export class CiStack extends Stack {
	constructor(scope: Construct, id: string, props: CiStackProps) {
		super(scope, id, props)

		const github = new OidcProviderNative(this, 'GitHubOidc', {
			url: 'https://token.actions.githubusercontent.com',
			clientIds: ['sts.amazonaws.com']
		})

		const role = new Role(this, 'DeployRole', {
			roleName: props.roleName,
			maxSessionDuration: Duration.hours(1),
			assumedBy: new WebIdentityPrincipal(github.oidcProviderArn, {
				StringEquals: {
					'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
					'token.actions.githubusercontent.com:sub': deployEnvironments.map(
						(environment) => `repo:${props.githubRepo}:environment:${environment}`
					)
				}
			})
		})

		role.addToPolicy(
			new PolicyStatement({
				actions: ['sts:AssumeRole'],
				// Default-qualifier bootstrap roles: deploy, file-publishing, image-publishing, lookup.
				resources: [
					`arn:aws:iam::${this.account}:role/cdk-hnb659fds-*-${this.account}-${this.region}`
				]
			})
		)

		const e2eRole = new Role(this, 'E2eRole', {
			roleName: props.e2eRoleName,
			maxSessionDuration: Duration.hours(1),
			assumedBy: new WebIdentityPrincipal(github.oidcProviderArn, {
				StringEquals: {
					'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
					'token.actions.githubusercontent.com:sub': `repo:${props.githubRepo}:environment:dev`
				}
			})
		})

		// What scripts/seed-pours.ts does: list a test user's pours, delete them, write fresh ones.
		e2eRole.addToPolicy(
			new PolicyStatement({
				actions: ['dynamodb:Query', 'dynamodb:PutItem', 'dynamodb:DeleteItem'],
				resources: [`arn:aws:dynamodb:${this.region}:${this.account}:table/${data.dev.tableName}`]
			})
		)
	}
}
