import { purgeExpired } from '../../src/lib/expiry';

export const config = { runtime: 'edge' };

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
