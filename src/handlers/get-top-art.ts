import jwt from 'jsonwebtoken';
import { getAlbumImages } from '../services/spotify';
import { errorResponse, getBearerToken, jsonResponse } from '../utils/http';
import { AuthTokenPayload } from '../utils/types';

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

    const payload = jwt.verify(bearer, secret) as AuthTokenPayload;
    const images = await getAlbumImages(payload.accessToken);

    return jsonResponse({ images });
  } catch (err: any) {
    console.error('get-top-art error', err?.response?.data || err);
    const status = err?.name === 'JsonWebTokenError' ? 401 : 500;
    return errorResponse('Failed to fetch album art', status);
  }
};
