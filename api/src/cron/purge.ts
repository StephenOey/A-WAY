import { purgeExpired } from '../lib/expiry';

export const config = { runtime: 'edge' };

/**
 * Called daily by Vercel Cron (see vercel.json).
 * Deletes annotations whose expires_at has passed.
 * Secured by CRON_SECRET to prevent unauthorised invocations.
 */
export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get('Authorization');
    if (auth !== `Bearer ${secret}`) {
      return new Response('Unauthorized', { status: 401 });
    }
  }

  await purgeExpired();
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
