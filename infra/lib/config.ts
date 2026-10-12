/** Account-level values shared by every CDK app in infra/bin. */
export const account = '187864192245'
export const region = 'us-west-1'

/** GitHub repository whose Actions runs may deploy (see ci-stack.ts and .github/workflows). */
export const githubRepo = 'blakenetz/pour-decisions'

/** Name of the IAM role GitHub Actions assumes; referenced verbatim by .github/workflows/deploy.yml. */
export const githubDeployRoleName = 'pour-decisions-github-deploy'

export const deployEnvironments = ['dev', 'prod'] as const
export type DeployEnvironment = (typeof deployEnvironments)[number]

/**
 * Live resources owned by PourDecisionsStack. Every environment points at the same ones until
 * per-environment data infrastructure exists.
 */
export const data = {
	tableName: 'pour-decisions-tastings',
	settingsTableName: 'pour-decisions-user-settings',
	userPoolId: 'us-west-1_CfmKBSS3p',
	userPoolClientId: '662qvpjlv07qrt7qraiuj13gdd',
	cognitoDomain: 'us-west-1cfmkbss3p.auth.us-west-1.amazoncognito.com'
}

/**
 * Origins each web environment is served from. CloudFront assigns these domains when the
 * distribution is created; they are registered as Cognito callback/logout URLs in
 * PourDecisionsStack. Replace them when custom domains are added.
 */
export const webOrigins: Record<DeployEnvironment, string> = {
	dev: 'https://d1lmiwd3962q0p.cloudfront.net',
	prod: 'https://d3bmjl131h971g.cloudfront.net'
}
