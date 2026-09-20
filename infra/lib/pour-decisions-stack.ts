import {
	CfnResource,
	Duration,
	RemovalPolicy,
	SecretValue,
	Stack,
	type StackProps
} from 'aws-cdk-lib'
import {
	AccountRecovery,
	CfnUserPoolClient,
	FeaturePlan,
	ManagedLoginVersion,
	Mfa,
	OAuthScope,
	OidcAttributeRequestMethod,
	ProviderAttribute,
	UserPool,
	UserPoolClient,
	UserPoolClientIdentityProvider,
	UserPoolDomain,
	UserPoolIdentityProviderGoogle,
	UserPoolIdentityProviderOidc
} from 'aws-cdk-lib/aws-cognito'
import { AttributeType, Billing, TableV2 } from 'aws-cdk-lib/aws-dynamodb'
import type { Construct } from 'constructs'

export interface PourDecisionsStackProps extends StackProps {
	/** OAuth client secret for the "Google" Cognito identity provider. Never hardcode this value. */
	readonly googleClientSecret: string
	/** OAuth client secret for the "GitHub" Cognito OIDC identity provider. Never hardcode this value. */
	readonly githubClientSecret: string
}

/**
 * `cdk import` (and CloudFormation resource import generally) always forces `DeletionPolicy:
 * Retain` onto every imported resource, but leaves `UpdateReplacePolicy` untouched. Resources
 * that don't otherwise set a removal policy default to no `UpdateReplacePolicy` at all, so this
 * helper reproduces exactly that shape (Retain deletion only) to keep `cdk diff` clean.
 */
function retainDeletionPolicyOnly(construct: Construct): void {
	const cfnResource = construct.node.defaultChild as CfnResource
	cfnResource.applyRemovalPolicy(RemovalPolicy.RETAIN, { applyToUpdateReplacePolicy: false })
}

/**
 * Brings already-provisioned pour-decisions AWS resources (DynamoDB table, Cognito user pool,
 * app client, hosted domain, and Google/GitHub identity providers) under CloudFormation
 * management via `cdk import`. Every property below was transcribed 1:1 from the corresponding
 * `aws dynamodb describe-table` / `aws cognito-idp describe-*` output so that `cdk import`
 * sees zero drift against the live resources.
 */
export class PourDecisionsStack extends Stack {
	constructor(scope: Construct, id: string, props: PourDecisionsStackProps) {
		super(scope, id, props)

		// --- DynamoDB table (aws dynamodb describe-table --table-name pour-decisions-tastings) ---
		new TableV2(this, 'TastingsTable', {
			tableName: 'pour-decisions-tastings',
			partitionKey: { name: 'userId', type: AttributeType.STRING },
			sortKey: { name: 'entryId', type: AttributeType.STRING },
			billing: Billing.onDemand(), // BillingModeSummary.BillingMode: PAY_PER_REQUEST
			removalPolicy: RemovalPolicy.RETAIN,
			deletionProtection: false // DeletionProtectionEnabled: false
		})

		// --- Cognito user pool (aws cognito-idp describe-user-pool --user-pool-id us-west-1_CfmKBSS3p) ---
		// Schema is intentionally left unspecified: the live pool's SchemaAttributes are exactly
		// Cognito's un-customized default set (no `standardAttributes`/`customAttributes` were ever
		// applied), so omitting it here matches reality without risking a transcription mismatch.
		const userPool = new UserPool(this, 'UserPool', {
			userPoolName: 'pour-decisions', // Name
			selfSignUpEnabled: true, // AdminCreateUserConfig.AllowAdminCreateUserOnly: false
			signInAliases: { username: false, email: true }, // UsernameAttributes: [email]
			autoVerify: { email: true }, // AutoVerifiedAttributes: [email]
			signInPolicy: { allowedFirstAuthFactors: { password: true } }, // Policies.SignInPolicy
			passwordPolicy: {
				minLength: 8,
				requireLowercase: true,
				requireUppercase: true,
				requireDigits: true,
				requireSymbols: true,
				tempPasswordValidity: Duration.days(7)
			}, // Policies.PasswordPolicy
			mfa: Mfa.OFF, // MfaConfiguration: OFF
			accountRecovery: AccountRecovery.EMAIL_AND_PHONE_WITHOUT_MFA, // AccountRecoverySetting
			featurePlan: FeaturePlan.ESSENTIALS, // UserPoolTier: ESSENTIALS
			removalPolicy: RemovalPolicy.RETAIN,
			deletionProtection: true // DeletionProtection: ACTIVE
		})

		// --- Identity providers (aws cognito-idp describe-identity-provider --provider-name Google|GitHub) ---
		const googleIdentityProvider = new UserPoolIdentityProviderGoogle(
			this,
			'GoogleIdentityProvider',
			{
				userPool,
				clientId: '645041553517-v47va3nlqsjdo45mfmu35lvd2562tcbq.apps.googleusercontent.com',
				clientSecretValue: SecretValue.unsafePlainText(props.googleClientSecret),
				scopes: ['email', 'openid', 'profile'], // authorize_scopes: "email openid profile"
				attributeMapping: {
					email: ProviderAttribute.GOOGLE_EMAIL,
					emailVerified: ProviderAttribute.GOOGLE_EMAIL_VERIFIED,
					fullname: ProviderAttribute.GOOGLE_NAME,
					custom: { username: ProviderAttribute.other('sub') }
				}
			}
		)
		// CloudFormation always forces DeletionPolicy: Retain on imported resources; match it
		// explicitly so the synthesized template has zero diff against the imported stack.
		retainDeletionPolicyOnly(googleIdentityProvider)

		const githubIdentityProvider = new UserPoolIdentityProviderOidc(
			this,
			'GitHubIdentityProvider',
			{
				userPool,
				name: 'GitHub',
				clientId: 'Ov23lignhUFiRINHy0PH',
				clientSecret: props.githubClientSecret,
				issuerUrl: 'https://token.actions.githubusercontent.com',
				scopes: ['openid', 'profile', 'email'], // authorize_scopes: "openid profile email"
				attributeRequestMethod: OidcAttributeRequestMethod.GET,
				attributeMapping: {
					email: ProviderAttribute.other('email'),
					custom: { username: ProviderAttribute.other('sub') }
				}
				// endpoints intentionally left unspecified: the live provider only stores `oidc_issuer`
				// and relies on Cognito's runtime OIDC discovery, matching CDK's default behavior.
			}
		)
		retainDeletionPolicyOnly(githubIdentityProvider)

		// --- User pool app client (aws cognito-idp describe-user-pool-client) ---
		const userPoolClient = new UserPoolClient(this, 'UserPoolClient', {
			userPool,
			userPoolClientName: 'pour-decisions', // ClientName
			generateSecret: false, // GenerateSecret: false
			authFlows: { userSrp: true, user: true }, // ExplicitAuthFlows (ALLOW_REFRESH_TOKEN_AUTH always added)
			oAuth: {
				flows: { authorizationCodeGrant: true }, // AllowedOAuthFlows: [code]
				scopes: [OAuthScope.EMAIL, OAuthScope.OPENID, OAuthScope.PROFILE], // AllowedOAuthScopes
				callbackUrls: ['http://localhost:8008/auth/callback'], // CallbackURLs (PUBLIC_OAUTH_REDIRECT_SIGNIN)
				logoutUrls: ['http://localhost:8008/'] // LogoutURLs (PUBLIC_OAUTH_REDIRECT_SIGNOUT)
			},
			supportedIdentityProviders: [
				UserPoolClientIdentityProvider.COGNITO,
				UserPoolClientIdentityProvider.GOOGLE,
				UserPoolClientIdentityProvider.custom('GitHub')
			], // SupportedIdentityProviders: [COGNITO, GitHub, Google]
			preventUserExistenceErrors: true, // PreventUserExistenceErrors: ENABLED
			enableTokenRevocation: true, // EnableTokenRevocation: true
			enablePropagateAdditionalUserContextData: false, // EnablePropagateAdditionalUserContextData: false
			authSessionValidity: Duration.minutes(3) // AuthSessionValidity: 3 (minutes)
			// idToken/accessToken/refreshToken validity are set below via the L1 escape hatch: the L2
			// construct always renders TokenValidityUnits with a single "minutes" unit for all three
			// fields, but the live client uses "days" for RefreshToken specifically.
		})
		const cfnUserPoolClient = userPoolClient.node.defaultChild as CfnUserPoolClient
		cfnUserPoolClient.accessTokenValidity = 60 // AccessTokenValidity: 60
		cfnUserPoolClient.idTokenValidity = 60 // IdTokenValidity: 60
		cfnUserPoolClient.refreshTokenValidity = 5 // RefreshTokenValidity: 5
		cfnUserPoolClient.tokenValidityUnits = {
			accessToken: 'minutes',
			idToken: 'minutes',
			refreshToken: 'days'
		} // TokenValidityUnits: { AccessToken: minutes, IdToken: minutes, RefreshToken: days }
		userPoolClient.node.addDependency(googleIdentityProvider)
		userPoolClient.node.addDependency(githubIdentityProvider)
		retainDeletionPolicyOnly(userPoolClient)

		// --- Hosted UI domain (aws cognito-idp describe-user-pool-domain --domain us-west-1cfmkbss3p) ---
		const userPoolDomain = new UserPoolDomain(this, 'UserPoolDomain', {
			userPool,
			cognitoDomain: { domainPrefix: 'us-west-1cfmkbss3p' }, // Domain: us-west-1cfmkbss3p
			managedLoginVersion: ManagedLoginVersion.NEWER_MANAGED_LOGIN // ManagedLoginVersion: 2
		})
		retainDeletionPolicyOnly(userPoolDomain)
	}
}
