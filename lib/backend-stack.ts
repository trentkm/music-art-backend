import * as path from 'path';
import { URL } from 'url';
import { Stack, StackProps, Duration, RemovalPolicy } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Runtime, LayerVersion, Code } from 'aws-cdk-lib/aws-lambda';
import { RestApi, LambdaIntegration, Cors } from 'aws-cdk-lib/aws-apigateway';
import { Bucket, HttpMethods, BlockPublicAccess } from 'aws-cdk-lib/aws-s3';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';

export class BackendStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const resolveOrigin = (value?: string) => {
      if (!value) return '*';
      if (value === '*') return '*';
      try {
        const url = new URL(value);
        return `${url.protocol}//${url.host}`;
      } catch {
        return value;
      }
    };

    const frontendOrigin = resolveOrigin(process.env.FRONTEND_URL);

    const bucket = new Bucket(this, 'GeneratedImagesBucket', {
      publicReadAccess: true,
      blockPublicAccess: new BlockPublicAccess({
        blockPublicAcls: false,
        ignorePublicAcls: false,
        blockPublicPolicy: false,
        restrictPublicBuckets: false
      }),
      removalPolicy: RemovalPolicy.RETAIN,
      cors: [
        {
          allowedOrigins: [frontendOrigin],
          allowedMethods: [HttpMethods.GET, HttpMethods.PUT],
          allowedHeaders: ['*']
        }
      ]
    });

    const sharpLayer =
      process.env.SHARP_LAYER_ARN && process.env.SHARP_LAYER_ARN.length > 0
        ? LayerVersion.fromLayerVersionArn(this, 'SharpLayerImported', process.env.SHARP_LAYER_ARN)
        : new LayerVersion(this, 'SharpLayer', {
            code: Code.fromAsset(path.join(__dirname, '../layers/sharp')),
            compatibleRuntimes: [Runtime.NODEJS_18_X],
            description: 'Sharp lambda layer'
          });

    const envVars = {
      SPOTIFY_CLIENT_ID: process.env.SPOTIFY_CLIENT_ID || '',
      SPOTIFY_CLIENT_SECRET: process.env.SPOTIFY_CLIENT_SECRET || '',
      OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
      BUCKET_NAME: bucket.bucketName,
      CALLBACK_URL: process.env.CALLBACK_URL || '',
      FRONTEND_URL: frontendOrigin
    };

    const commonLambdaProps = {
      runtime: Runtime.NODEJS_18_X,
      handler: 'handler',
      memorySize: 512,
      timeout: Duration.seconds(15),
      environment: envVars,
      bundling: {
        externalModules: ['sharp']
      }
    };

    const authLoginFn = new NodejsFunction(this, 'AuthLoginFn', {
      entry: path.join(__dirname, '../src/handlers/auth-login.ts'),
      ...commonLambdaProps
    });

    const authCallbackFn = new NodejsFunction(this, 'AuthCallbackFn', {
      entry: path.join(__dirname, '../src/handlers/auth-callback.ts'),
      ...commonLambdaProps
    });

    const topArtFn = new NodejsFunction(this, 'TopArtFn', {
      entry: path.join(__dirname, '../src/handlers/get-top-art.ts'),
      ...commonLambdaProps
    });

    const generateImageFn = new NodejsFunction(this, 'GenerateImageFn', {
      entry: path.join(__dirname, '../src/handlers/generate-image.ts'),
      ...commonLambdaProps,
      memorySize: 1024,
      timeout: Duration.seconds(30),
      layers: [sharpLayer]
    });

    bucket.grantReadWrite(generateImageFn);

    const bucketPolicy = new PolicyStatement({
      actions: ['s3:GetObject'],
      resources: [bucket.arnForObjects('*')]
    });
    authLoginFn.addToRolePolicy(bucketPolicy);
    authCallbackFn.addToRolePolicy(bucketPolicy);
    topArtFn.addToRolePolicy(bucketPolicy);

    const api = new RestApi(this, 'MusicArtApi', {
      restApiName: 'Music Art API',
      defaultCorsPreflightOptions: {
        allowOrigins: frontendOrigin === '*' ? Cors.ALL_ORIGINS : [frontendOrigin],
        allowMethods: Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'Authorization']
      }
    });

    const authResource = api.root.addResource('auth');
    authResource.addResource('login').addMethod('GET', new LambdaIntegration(authLoginFn));
    authResource.addResource('callback').addMethod('GET', new LambdaIntegration(authCallbackFn));

    const authExchange = authResource.addResource('exchange');
    authExchange.addMethod('POST', new LambdaIntegration(authCallbackFn));
    authExchange.addCorsPreflight({
      allowOrigins: frontendOrigin === '*' ? Cors.ALL_ORIGINS : [frontendOrigin],
      allowMethods: ['OPTIONS', 'POST'],
      allowHeaders: ['Content-Type', 'Authorization']
    });

    const spotifyResource = api.root.addResource('spotify');
    spotifyResource.addResource('top-art').addMethod('GET', new LambdaIntegration(topArtFn));

    const imageResource = api.root.addResource('image');
    imageResource.addResource('generate').addMethod('POST', new LambdaIntegration(generateImageFn));
  }
}
