import axios from 'axios';
import { AlbumArt, SpotifyTokenData } from '../utils/types';

const TOKEN_URL = 'https://accounts.spotify.com/api/token';
const API_BASE = 'https://api.spotify.com/v1';

const basicAuth = () => {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('Missing Spotify client credentials');
  }
  return Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
};

export const getAccessToken = async (code: string, redirectUri: string): Promise<SpotifyTokenData> => {
  const form = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri
  });

  const { data } = await axios.post<SpotifyTokenData>(TOKEN_URL, form.toString(), {
    headers: {
      Authorization: `Basic ${basicAuth()}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  });

  return data;
};

export const getTopArtists = async (accessToken: string, limit = 5) => {
  const { data } = await axios.get(`${API_BASE}/me/top/artists`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    params: { limit }
  });
  return data.items as any[];
};

export const getAlbums = async (artistId: string, accessToken: string, limit = 4) => {
  const { data } = await axios.get(`${API_BASE}/artists/${artistId}/albums`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    params: { include_groups: 'album,single', market: 'US', limit }
  });
  return data.items as any[];
};

export const getAlbumImages = async (accessToken: string): Promise<AlbumArt[]> => {
  const artists = await getTopArtists(accessToken);
  const albumsByArtist = await Promise.all(
    artists.map(async (artist) => {
      const albums = await getAlbums(artist.id, accessToken);
      return albums.map((album: any) => ({
        artistName: artist.name,
        albumName: album.name,
        imageUrl: album.images?.[0]?.url,
        releasedAt: album.release_date
      })) as AlbumArt[];
    })
  );

  return albumsByArtist
    .flat()
    .filter((album) => Boolean(album.imageUrl))
    .slice(0, 25);
};
