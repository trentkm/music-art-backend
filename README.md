# Music Art Backend

Serverless backend for generating blended album artwork using Spotify listening data, Sharp collages, and OpenAI image editing. Deployed with AWS CDK.

## Prerequisites
- Node.js 18+
- AWS credentials with permission to deploy CDK stacks
- Bootstrap the target AWS account/region for CDK (`cdk bootstrap`)

## Setup
1. Copy `env.example` to `.env` and fill in Spotify/OpenAI credentials, callback URL, and frontend URL.
2. Install dependencies: `npm install`
3. Optionally synthesize the stack locally: `npm run synth`

## Deployment
- Bootstrap (first time per account/region): `npm run cdk -- bootstrap`
- Deploy the stack: `npm run deploy` (alias for `cdk deploy`)
- Update stack after changes: `npm run cdk -- deploy MusicArtBackendStack`

## Architecture
- API Gateway (REST) with CORS to the configured frontend domain.
- Lambda functions:
  - `auth-login` → redirect to Spotify OAuth.
  - `auth-callback` → exchange code for tokens and return JWT.
  - `get-top-art` → fetch user top artists/albums and return album art URLs.
  - `generate-image` → build Sharp collage, blend via OpenAI, upload result to S3.
- S3 bucket for generated images with public read + CORS.
- Sharp provided via a Lambda Layer to keep bundle sizes small.

### Sharp Layer Options
- **Local asset**: Build `sharp` for Amazon Linux in `layers/sharp/nodejs/node_modules/sharp/` (use Docker `public.ecr.aws/lambda/nodejs:18` to run `npm install sharp`).
- **Prebuilt**: Set `SHARP_LAYER_ARN` in `.env` to point to an existing Sharp Lambda layer ARN; the stack will import it instead of bundling a local asset.

## Required AWS Permissions
- `cloudformation:*`, `iam:*`, `lambda:*`, `apigateway:*`, `s3:*`, and supporting services to deploy via CDK.
- Runtime IAM for Lambdas:
  - `s3:PutObject` and `s3:GetObject` on the generated images bucket.

## Local Testing
- Unit-level: run individual handlers with `ts-node` and mock payloads.
- Manual flow:
  1. `npm run synth` to ensure infrastructure compiles.
  2. Invoke handlers via `ts-node src/handlers/<handler>.ts` with crafted events or use `aws lambda invoke` against a deployed stack.
  3. Verify OpenAI/Spotify credentials with small requests to avoid rate limits.

## Notes
- Ensure `CALLBACK_URL` matches the API Gateway endpoint after deployment.
- The Sharp layer must include the compiled `sharp` binaries compatible with AWS Lambda (placed under `layers/sharp/nodejs/node_modules/sharp`).
