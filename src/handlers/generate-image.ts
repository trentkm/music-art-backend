import jwt from 'jsonwebtoken';
import { blendImage } from '../services/ai';
import { buildCollage } from '../services/collage';
import { uploadImage } from '../services/storage';
import { errorResponse, getBearerToken, jsonResponse } from '../utils/http';
import { AuthTokenPayload, GenerateImageRequest } from '../utils/types';

export const handler = async (event: any) => {
  try {
    console.log('generate-image invocation', {
      hasAuthorization: Boolean(event.headers?.Authorization || event.headers?.authorization),
      requestId: event.requestContext?.requestId,
      sourceIp: event.requestContext?.identity?.sourceIp
    });

    const bearer = getBearerToken(event.headers?.Authorization || event.headers?.authorization);
    if (!bearer) {
      console.warn('generate-image missing bearer token');
      return errorResponse('Unauthorized', 401);
    }

    const secret = process.env.SPOTIFY_CLIENT_SECRET;
    if (!secret) {
      console.error('generate-image missing signing secret env var');
      return errorResponse('Missing signing secret', 500);
    }

    const tokenPayload = jwt.verify(bearer, secret) as AuthTokenPayload;
    console.log('generate-image token verified', {
      expiresAt: tokenPayload?.expiresAt,
      hasAccessToken: Boolean(tokenPayload?.accessToken)
    });

    const body: GenerateImageRequest = event.body ? JSON.parse(event.body) : {};

    if (!body.imageUrls?.length) {
      console.warn('generate-image missing imageUrls');
      return errorResponse('imageUrls are required', 400);
    }

    console.log('generate-image starting pipeline', {
      imageCount: body.imageUrls.length,
      hasPrompt: Boolean(body.prompt)
    });

    const collagePath = await buildCollage(body.imageUrls);
    console.log('generate-image collage built', { collagePath });

    const blended = await blendImage(collagePath, body.prompt);
    console.log('generate-image blend complete', { bufferBytes: blended.length });

    const url = await uploadImage(blended);
    console.log('generate-image upload complete', { url });

    return {
      statusCode: 200,
      body: JSON.stringify({ url })
    };
  } catch (err: any) {
    console.error('generate-image error', err?.response?.data || err);
    const status = err?.name === 'JsonWebTokenError' ? 401 : 500;
    return errorResponse('Failed to generate image', status);
  }
};
