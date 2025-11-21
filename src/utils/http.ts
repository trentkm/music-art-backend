import { LambdaResponse } from './types';

const allowedOrigin = () => {
  const configured = process.env.FRONTEND_URL;
  if (!configured) return '*';
  try {
    const url = new URL(configured);
    return `${url.protocol}//${url.host}`;
  } catch {
    return configured;
  }
};

const defaultHeaders = () => ({
  'Access-Control-Allow-Origin': allowedOrigin(),
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Credentials': 'true'
});

export const jsonResponse = (body: unknown, statusCode = 200): LambdaResponse => ({
  statusCode,
  headers: defaultHeaders(),
  body: JSON.stringify(body)
});

export const errorResponse = (message: string, statusCode = 500): LambdaResponse =>
  jsonResponse({ error: message }, statusCode);

export const redirectResponse = (location: string): LambdaResponse => ({
  statusCode: 302,
  headers: { ...defaultHeaders(), Location: location },
  body: ''
});

export const getBearerToken = (authorizationHeader?: string): string | null => {
  if (!authorizationHeader) return null;
  const [type, token] = authorizationHeader.split(' ');
  if (type?.toLowerCase() !== 'bearer' || !token) return null;
  return token;
};
