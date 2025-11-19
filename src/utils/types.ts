export interface LambdaResponse {
  statusCode: number;
  headers?: Record<string, string>;
  body: string;
}

export interface SpotifyTokenData {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope?: string;
  token_type?: string;
}

export interface AuthTokenPayload {
  accessToken: string;
  refreshToken?: string;
  scope?: string;
  tokenType?: string;
  expiresAt: number;
}

export interface AlbumArt {
  artistName: string;
  albumName: string;
  imageUrl: string;
  releasedAt?: string;
}

export interface GenerateImageRequest {
  imageUrls: string[];
  prompt?: string;
}
