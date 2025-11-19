import jwt from 'jsonwebtoken';
import { blendImage } from '../services/ai';
import { buildCollage } from '../services/collage';
import { uploadImage } from '../services/storage';
import { errorResponse, getBearerToken, jsonResponse } from '../utils/http';
import { AuthTokenPayload, GenerateImageRequest } from '../utils/types';

export const handler = async (event: any) => {
  try {
    const bearer = getBearerToken(event.headers?.Authorization || event.headers?.authorization);
    if (!bearer) {
      return errorResponse('Unauthorized', 401);
    }

    const secret = process.env.SPOTIFY_CLIENT_SECRET;
    if (!secret) {
      return errorResponse('Missing signing secret', 500);
    }

    jwt.verify(bearer, secret) as AuthTokenPayload;

    const body: GenerateImageRequest = event.body ? JSON.parse(event.body) : {};
    if (!body.imageUrls?.length) {
      return errorResponse('imageUrls are required', 400);
    }

    const collagePath = await buildCollage(body.imageUrls);
    const blended = await blendImage(collagePath, body.prompt);
    const url = await uploadImage(blended);

    return jsonResponse({ url });
  } catch (err: any) {
    console.error('generate-image error', err?.response?.data || err);
    const status = err?.name === 'JsonWebTokenError' ? 401 : 500;
    return errorResponse('Failed to generate image', status);
  }
};
