import jwt from 'jsonwebtoken';
import { getAccessToken } from '../services/spotify';
import { errorResponse, jsonResponse } from '../utils/http';
import { AuthTokenPayload } from '../utils/types';

export const handler = async (event: any) => {
  try {
    const code = event.queryStringParameters?.code;
    const error = event.queryStringParameters?.error;

    if (error) {
      return errorResponse(`Spotify auth error: ${error}`, 400);
    }

    if (!code) {
      return errorResponse('Missing authorization code', 400);
    }

    const redirectUri = process.env.CALLBACK_URL;
    if (!redirectUri) {
      return errorResponse('CALLBACK_URL is not configured', 500);
    }

    const tokenData = await getAccessToken(code, redirectUri);

    const payload: AuthTokenPayload = {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      scope: tokenData.scope,
      tokenType: tokenData.token_type,
      expiresAt: Date.now() + tokenData.expires_in * 1000
    };

    const secret = process.env.SPOTIFY_CLIENT_SECRET;
    if (!secret) {
      return errorResponse('Missing signing secret', 500);
    }

    const token = jwt.sign(payload, secret, { expiresIn: '1h' });
    return jsonResponse({ token });
  } catch (err: any) {
    console.error('auth-callback error', err?.response?.data || err);
    return errorResponse('Failed to complete Spotify auth', 500);
  }
};
