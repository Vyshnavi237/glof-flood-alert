import { NextResponse } from 'next/server';

export const ALLOWED_PRODUCTION_ORIGIN = 'https://flood-watcher.vercel.app';

/**
 * Checks if the given origin is allowed:
 * - https://flood-watcher.vercel.app specifically
 * - http://localhost:* (any port for local testing)
 * - http://127.0.0.1:* (IPv4 loopback)
 */
export function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;

  if (origin === ALLOWED_PRODUCTION_ORIGIN) {
    return true;
  }

  // Allow http://localhost or http://localhost:<port>
  if (/^http:\/\/localhost(:\d+)?$/.test(origin)) {
    return true;
  }

  // Allow http://127.0.0.1 or http://127.0.0.1:<port>
  if (/^http:\/\/127\.0\.0\.1(:\d+)?$/.test(origin)) {
    return true;
  }

  return false;
}

/**
 * Returns the CORS headers for a given request and allowed methods.
 */
export function getCorsHeaders(
  request: Request,
  allowedMethods = 'GET, POST, OPTIONS'
): Record<string, string> {
  const origin = request.headers.get('origin');
  const allowed = isAllowedOrigin(origin);

  // If the request origin matches allowed origins, reflect it; otherwise default to production
  const allowOrigin = allowed && origin ? origin : ALLOWED_PRODUCTION_ORIGIN;

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': allowedMethods,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

/**
 * Handles CORS OPTIONS preflight request.
 */
export function handleCorsPreflight(
  request: Request,
  allowedMethods = 'GET, POST, OPTIONS'
): NextResponse {
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(request, allowedMethods),
  });
}
