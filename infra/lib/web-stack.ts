import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { CfnOutput, Duration, RemovalPolicy, Stack, type StackProps } from 'aws-cdk-lib'
import {
	AllowedMethods,
	type BehaviorOptions,
	CachePolicy,
	Function as CloudFrontFunction,
	Distribution,
	FunctionCode,
	FunctionEventType,
	FunctionRuntime,
	HttpVersion,
	OriginRequestPolicy,
	PriceClass,
	ResponseHeadersPolicy,
	ViewerProtocolPolicy
} from 'aws-cdk-lib/aws-cloudfront'
import { FunctionUrlOrigin, S3BucketOrigin } from 'aws-cdk-lib/aws-cloudfront-origins'
import { Table } from 'aws-cdk-lib/aws-dynamodb'
import { PolicyStatement } from 'aws-cdk-lib/aws-iam'
import {
	Architecture,
	Code,
	FunctionUrlAuthType,
	Function as LambdaFunction,
	LayerVersion,
	Runtime
} from 'aws-cdk-lib/aws-lambda'
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs'
import { BlockPublicAccess, Bucket, BucketEncryption } from 'aws-cdk-lib/aws-s3'
import { BucketDeployment, CacheControl, Source } from 'aws-cdk-lib/aws-s3-deployment'
import type { Construct } from 'constructs'
import type { DeployEnvironment } from './config'

/** Header the CloudFront viewer-request function copies the viewer's Host into (see below). */
const FORWARDED_HOST_HEADER = 'x-forwarded-host'

export interface WebStackProps extends StackProps {
	readonly environment: DeployEnvironment
	/** Lambda zip root staged by `pnpm package:lambda` (adapter-node build + traced node_modules). */
	readonly lambdaDir: string
	/** adapter-node's `build/client`: everything served as a static file. */
	readonly clientDir: string
	/** Runtime environment for the SvelteKit server ($env/dynamic/*). */
	readonly appEnv: Record<string, string>
	readonly tableName: string
	readonly userPoolId: string
}

/**
 * One web environment: CloudFront in front of the SvelteKit server (adapter-node on Lambda via
 * Lambda Web Adapter, exposed through a Function URL) and an S3 bucket for static files.
 *
 * Everything here sits inside AWS's always-free allowances at current traffic (Lambda 1M
 * requests/month, CloudFront 1 TB + 10M requests/month), so an idle environment costs nothing.
 */
export class WebStack extends Stack {
	constructor(scope: Construct, id: string, props: WebStackProps) {
		super(scope, id, props)

		// --- Static files -------------------------------------------------------------------------
		const assets = new Bucket(this, 'Assets', {
			blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
			encryption: BucketEncryption.S3_MANAGED,
			enforceSSL: true,
			// Contents are rebuilt on every deploy, so nothing here needs to outlive the stack.
			removalPolicy: RemovalPolicy.DESTROY,
			autoDeleteObjects: true
		})

		// `prune: false` on both uploads keeps previous deploys' hashed chunks around: a tab (or
		// installed PWA) still running the old build can keep lazy-loading its own chunks instead of
		// 404ing until it reloads.
		const immutableUpload = new BucketDeployment(this, 'UploadImmutableAssets', {
			destinationBucket: assets,
			sources: [Source.asset(props.clientDir)],
			exclude: ['*'],
			include: ['_app/immutable/*'],
			cacheControl: [CacheControl.fromString('public, max-age=31536000, immutable')],
			prune: false
		})
		new BucketDeployment(this, 'UploadMutableAssets', {
			destinationBucket: assets,
			sources: [Source.asset(props.clientDir)],
			exclude: ['_app/immutable/*'],
			// Unhashed names (manifest, service worker, _app/version.json, icons) must revalidate so a
			// deploy is picked up immediately.
			cacheControl: [CacheControl.fromString('public, max-age=0, must-revalidate')],
			prune: false
		})

		// --- SvelteKit server ---------------------------------------------------------------------
		const server = new LambdaFunction(this, 'Server', {
			runtime: Runtime.NODEJS_22_X,
			architecture: Architecture.ARM_64,
			code: Code.fromAsset(props.lambdaDir),
			handler: 'run.sh',
			layers: [
				// https://github.com/awslabs/aws-lambda-web-adapter#zip-packages
				LayerVersion.fromLayerVersionArn(
					this,
					'LambdaWebAdapter',
					`arn:aws:lambda:${this.region}:753240598075:layer:LambdaAdapterLayerArm64:30`
				)
			],
			memorySize: 1024,
			timeout: Duration.seconds(15),
			logGroup: new LogGroup(this, 'ServerLogs', {
				retention: RetentionDays.TWO_WEEKS,
				removalPolicy: RemovalPolicy.DESTROY
			}),
			environment: {
				...props.appEnv,
				AWS_LAMBDA_EXEC_WRAPPER: '/opt/bootstrap',
				PORT: '8080',
				AWS_LWA_ENABLE_COMPRESSION: 'true',
				// The Function URL only ever sees its own hostname in Host, so adapter-node derives the
				// public origin (CSRF checks on form actions, OAuth redirect URIs) from this header.
				HOST_HEADER: FORWARDED_HOST_HEADER
			}
		})
		// New HTML references the new hashed chunks, so serve it only once they are uploaded.
		server.node.addDependency(immutableUpload)

		Table.fromTableName(this, 'TastingsTable', props.tableName).grantReadWriteData(server)
		server.addToRolePolicy(
			new PolicyStatement({
				// GitHub sign-in (src/routes/api/auth/github/callback) provisions Cognito users itself.
				actions: [
					'cognito-idp:AdminGetUser',
					'cognito-idp:AdminCreateUser',
					'cognito-idp:AdminSetUserPassword'
				],
				resources: [
					Stack.of(this).formatArn({
						service: 'cognito-idp',
						resource: 'userpool',
						resourceName: props.userPoolId
					})
				]
			})
		)

		// AWS_IAM auth (CloudFront OAC) would require browsers to send a payload hash on every
		// form POST, so the URL is public; the CSRF origin check still binds it to CloudFront's host.
		const serverUrl = server.addFunctionUrl({ authType: FunctionUrlAuthType.NONE })

		// --- CDN ----------------------------------------------------------------------------------
		const forwardHost = new CloudFrontFunction(this, 'ForwardHost', {
			runtime: FunctionRuntime.JS_2_0,
			code: FunctionCode.fromInline(
				`function handler(event) {
	var request = event.request;
	request.headers['${FORWARDED_HOST_HEADER}'] = { value: request.headers.host.value };
	return request;
}`
			)
		})

		// Preview environments must stay out of search results.
		const responseHeadersPolicy =
			props.environment === 'prod'
				? undefined
				: new ResponseHeadersPolicy(this, 'NoIndex', {
						customHeadersBehavior: {
							customHeaders: [{ header: 'X-Robots-Tag', value: 'noindex', override: true }]
						}
					})

		// Honor the Cache-Control set on each object at upload instead of a fixed TTL.
		const staticCachePolicy = new CachePolicy(this, 'StaticCachePolicy', {
			minTtl: Duration.seconds(0),
			defaultTtl: Duration.seconds(0),
			maxTtl: Duration.days(365),
			enableAcceptEncodingGzip: true,
			enableAcceptEncodingBrotli: true
		})
		const staticBehavior: BehaviorOptions = {
			origin: S3BucketOrigin.withOriginAccessControl(assets),
			viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
			allowedMethods: AllowedMethods.ALLOW_GET_HEAD,
			cachePolicy: staticCachePolicy,
			compress: true,
			responseHeadersPolicy
		}

		const distribution = new Distribution(this, 'Distribution', {
			comment: `pour-decisions ${props.environment}`,
			priceClass: PriceClass.PRICE_CLASS_100,
			httpVersion: HttpVersion.HTTP2_AND_3,
			defaultBehavior: {
				origin: new FunctionUrlOrigin(serverUrl),
				viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
				allowedMethods: AllowedMethods.ALLOW_ALL,
				cachePolicy: CachePolicy.CACHING_DISABLED,
				originRequestPolicy: OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
				functionAssociations: [
					{ function: forwardHost, eventType: FunctionEventType.VIEWER_REQUEST }
				],
				responseHeadersPolicy
			},
			additionalBehaviors: staticPathPatterns(props.clientDir).reduce<
				Record<string, BehaviorOptions>
			>((behaviors, pattern) => {
				behaviors[pattern] = staticBehavior
				return behaviors
			}, {})
		})

		new CfnOutput(this, 'Url', { value: `https://${distribution.distributionDomainName}` })
	}
}

/**
 * One CloudFront path pattern per top-level entry of the static build (`_app/*`, `fonts/*`,
 * `manifest.webmanifest`, ...). Every other path goes to the SvelteKit server.
 */
function staticPathPatterns(clientDir: string): string[] {
	return readdirSync(clientDir).map((name) =>
		statSync(join(clientDir, name)).isDirectory() ? `${name}/*` : name
	)
}
