import {
	CfnOutput,
	Duration,
	RemovalPolicy,
	SecretValue,
	Stack,
	type StackProps
} from 'aws-cdk-lib'
import {
	AccountRecovery,
	FeaturePlan,
	ManagedLoginVersion,
	Mfa,
	OAuthScope,
	ProviderAttribute,
	UserPool,
	UserPoolClient,
	UserPoolClientIdentityProvider,
	UserPoolDomain,
	UserPoolIdentityProviderGoogle
} from 'aws-cdk-lib/aws-cognito'
import { AttributeType, Billing, TableV2 } from 'aws-cdk-lib/aws-dynamodb'
import type { Construct } from 'constructs'
import type { DataConfig, DeployEnvironment } from './config'

export interface DataStackProps extends StackProps {
	readonly environment: DeployEnvironment
	/** Names of this environment's tables and its hosted-UI domain prefix. */
	readonly data: Pick<DataConfig, 'tableName' | 'settingsTableName' | 'domainPrefix'>
	/** Origins the app is served from; each gets a Cognito OAuth callback and logout URL. */
	readonly appOrigins: readonly string[]
	/** The Google OAuth client Cognito federates to. Its console must list this pool's
	 *  `https://<domain>/oauth2/idpresponse` as an authorized redirect URI. */
	readonly googleClientId: string
	readonly googleClientSecret: string
}

/**
 * Data and auth for a non-production environment: its own tastings and settings tables and its
 * own Cognito user pool, so PR deploys, local development and e2e seeding never touch prod.
 *
 * Production's equivalents live in PourDecisionsStack, which was `cdk import`ed from hand-built
 * resources and is transcribed property-for-property; this stack mirrors its sign-in behavior
 * with ordinary CDK defaults instead. GitHub sign-in needs nothing here: the app runs its own
 * GitHub OAuth flow and creates users in whichever pool it's configured with.
 */
export class DataStack extends Stack {
	constructor(scope: Construct, id: string, props: DataStackProps) {
		super(scope, id, props)

		new TableV2(this, 'TastingsTable', {
			tableName: props.data.tableName,
			partitionKey: { name: 'userId', type: AttributeType.STRING },
			sortKey: { name: 'entryId', type: AttributeType.STRING },
			billing: Billing.onDemand(),
			removalPolicy: RemovalPolicy.RETAIN
		})

		new TableV2(this, 'UserSettingsTable', {
			tableName: props.data.settingsTableName,
			partitionKey: { name: 'userId', type: AttributeType.STRING },
			billing: Billing.onDemand(),
			removalPolicy: RemovalPolicy.RETAIN
		})

		// Same sign-in rules as production's pool, so behavior found in dev holds in prod.
		const userPool = new UserPool(this, 'UserPool', {
			userPoolName: `pour-decisions-${props.environment}`,
			selfSignUpEnabled: true,
			signInAliases: { username: false, email: true },
			autoVerify: { email: true },
			signInPolicy: { allowedFirstAuthFactors: { password: true } },
			passwordPolicy: {
				minLength: 8,
				requireLowercase: true,
				requireUppercase: true,
				requireDigits: true,
				requireSymbols: true,
				tempPasswordValidity: Duration.days(7)
			},
			mfa: Mfa.OFF,
			accountRecovery: AccountRecovery.EMAIL_AND_PHONE_WITHOUT_MFA,
			featurePlan: FeaturePlan.ESSENTIALS,
			removalPolicy: RemovalPolicy.RETAIN
		})

		const google = new UserPoolIdentityProviderGoogle(this, 'GoogleIdentityProvider', {
			userPool,
			clientId: props.googleClientId,
			clientSecretValue: SecretValue.unsafePlainText(props.googleClientSecret),
			scopes: ['email', 'openid', 'profile'],
			attributeMapping: {
				email: ProviderAttribute.GOOGLE_EMAIL,
				emailVerified: ProviderAttribute.GOOGLE_EMAIL_VERIFIED,
				fullname: ProviderAttribute.GOOGLE_NAME
			}
		})

		const client = new UserPoolClient(this, 'UserPoolClient', {
			userPool,
			userPoolClientName: 'pour-decisions',
			generateSecret: false,
			authFlows: { userSrp: true, user: true },
			oAuth: {
				flows: { authorizationCodeGrant: true },
				scopes: [OAuthScope.EMAIL, OAuthScope.OPENID, OAuthScope.PROFILE],
				callbackUrls: props.appOrigins.map((origin) => `${origin}/auth/callback`),
				logoutUrls: props.appOrigins.map((origin) => `${origin}/`)
			},
			supportedIdentityProviders: [
				UserPoolClientIdentityProvider.COGNITO,
				UserPoolClientIdentityProvider.GOOGLE
			],
			preventUserExistenceErrors: true,
			enableTokenRevocation: true,
			authSessionValidity: Duration.minutes(3),
			accessTokenValidity: Duration.minutes(60),
			idTokenValidity: Duration.minutes(60),
			refreshTokenValidity: Duration.days(5)
		})
		client.node.addDependency(google)

		const domain = new UserPoolDomain(this, 'UserPoolDomain', {
			userPool,
			cognitoDomain: { domainPrefix: props.data.domainPrefix },
			managedLoginVersion: ManagedLoginVersion.NEWER_MANAGED_LOGIN
		})

		// Copied into config.ts after the first deploy; web stacks and local .env read them there.
		new CfnOutput(this, 'UserPoolId', { value: userPool.userPoolId })
		new CfnOutput(this, 'UserPoolClientId', { value: client.userPoolClientId })
		new CfnOutput(this, 'CognitoDomain', {
			value: `${domain.domainName}.auth.${this.region}.amazoncognito.com`
		})
	}
}
