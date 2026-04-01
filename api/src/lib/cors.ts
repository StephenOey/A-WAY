/**
 * CORS helper for Vercel edge functions.
 * The Figma plugin UI runs in a sandboxed iframe — responses need
 * Access-Control-Allow-Origin to allow cross-origin fetches.
 */

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

/** Attach CORS headers to an existing Response. */
export function withCors(res: Response): Response {
  const headers = new Headers(res.headers);
  for (const [k, v] of Object.entries(CORS_HEADERS)) {
    headers.set(k, v);
  }
  return new Response(res.body, { status: res.status, headers });
}

/** Respond to a CORS preflight OPTIONS request. */
export function preflight(): Response {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
