import { supabase } from '../lib/supabase';
import { withCors, preflight } from '../lib/cors';

export const config = { runtime: 'edge' };

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return preflight();
  if (req.method !== 'DELETE') {
    return withCors(new Response('Method Not Allowed', { status: 405 }));
  }

  // Parse id from URL path manually — edge functions don't inject path params.
  const url = new URL(req.url);
  const segments = url.pathname.split('/').filter(Boolean);
  const id = segments[segments.length - 1];

  if (!id) {
    return withCors(new Response('Missing id', { status: 400 }));
  }

  const { error } = await supabase
    .from('annotations')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('delete error:', error.message);
    return withCors(new Response('Internal Server Error', { status: 500 }));
  }

  return withCors(new Response(null, { status: 204 }));
}
