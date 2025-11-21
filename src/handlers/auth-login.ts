import { randomBytes } from 'crypto';
import { redirectResponse, errorResponse } from '../utils/http';

export const handler = async () => {
  try {
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const redirectUri = process.env.CALLBACK_URL;
    const frontendUrl = process.env.FRONTEND_URL;


    const missing = [];
    if (!clientId) missing.push('clientId');
    if (!redirectUri) missing.push('redirectUri');
    if (!frontendUrl) missing.push('frontendUrl');

    if (missing.length > 0) {
      return errorResponse(`Missing Spotify configuration: ${missing.join(', ')}`, 500);
    }

    if (!clientId || !redirectUri || !frontendUrl) {
      // This check is redundant due to the previous missing check, but added for TypeScript type safety
      return errorResponse('Missing Spotify configuration', 500);
    }

    const state = randomBytes(8).toString('hex');
    const scope = 'user-top-read';

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      scope,
      state,
      show_dialog: 'true'
    });

    const url = `https://accounts.spotify.com/authorize?${params.toString()}`;
    return redirectResponse(url);
  } catch (error: any) {
    console.error('auth-login error', error);
    return errorResponse('Failed to start Spotify login', 500);
  }
};
