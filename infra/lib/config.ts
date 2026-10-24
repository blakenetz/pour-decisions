/** Account-level values shared by every CDK app in infra/bin. */
export const account = '187864192245'
export const region = 'us-west-1'

/** GitHub repository whose Actions runs may deploy (see ci-stack.ts and .github/workflows). */
export const githubRepo = 'blakenetz/pour-decisions'

/** Name of the IAM role GitHub Actions assumes; referenced verbatim by .github/workflows/deploy.yml. */
export const githubDeployRoleName = 'pour-decisions-github-deploy'

/** Role the PR e2e run assumes to seed its test accounts; referenced verbatim by deploy.yml. */
export const githubE2eRoleName = 'pour-decisions-github-e2e'

export const deployEnvironments = ['dev', 'prod'] as const
export type DeployEnvironment = (typeof deployEnvironments)[number]

/** Data and auth resources one environment's app reads and writes. */
export interface DataConfig {
	tableName: string
	settingsTableName: string
	userPoolId: string
	userPoolClientId: string
	/** Hosted-UI domain prefix; the full domain is `cognitoDomain`. */
	domainPrefix: string
	cognitoDomain: string
}

/**
 * Each environment's data and auth. Prod's are the original resources owned by
 * PourDecisionsStack; dev's are created by DataStack (`PourDecisionsData-dev`), whose stack
 * outputs supply the Cognito ids. Dev serves PR deploys, local `pnpm dev`, and e2e seeding.
 */
export const data: Record<DeployEnvironment, DataConfig> = {
	dev: {
		tableName: 'pour-decisions-tastings-dev',
		settingsTableName: 'pour-decisions-user-settings-dev',
		userPoolId: 'us-west-1_wmKLnq0rh',
		userPoolClientId: '2glrp0sangmaoq65kjltk70qi6',
		domainPrefix: 'pour-decisions-dev',
		cognitoDomain: 'pour-decisions-dev.auth.us-west-1.amazoncognito.com'
	},
	prod: {
		tableName: 'pour-decisions-tastings',
		settingsTableName: 'pour-decisions-user-settings',
		userPoolId: 'us-west-1_CfmKBSS3p',
		userPoolClientId: '662qvpjlv07qrt7qraiuj13gdd',
		domainPrefix: 'us-west-1cfmkbss3p',
		cognitoDomain: 'us-west-1cfmkbss3p.auth.us-west-1.amazoncognito.com'
	}
}

/** The Google OAuth client every pool federates to (Google Cloud Console → Credentials). */
export const googleClientId =
	'645041553517-v47va3nlqsjdo45mfmu35lvd2562tcbq.apps.googleusercontent.com'

/**
 * Origins each web environment is served from. CloudFront assigns these domains when the
 * distribution is created; they are registered as Cognito callback/logout URLs in
 * PourDecisionsStack. Replace them when custom domains are added.
 */
export const webOrigins: Record<DeployEnvironment, string> = {
	dev: 'https://d1lmiwd3962q0p.cloudfront.net',
	prod: 'https://d3bmjl131h971g.cloudfront.net'
}
