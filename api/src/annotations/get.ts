import { supabase } from '../lib/supabase';

export const config = { runtime: 'edge' };

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const { searchParams } = new URL(req.url);
  const query = searchParams.get('query') ?? '';

  // Stub: return active annotations with naive text filter.
  // Replace with semantic/vector search when LLM layer is added.
  let dbQuery = supabase
    .from('annotations')
    .select('*')
    .eq('status', 'active');

  if (query) {
    dbQuery = dbQuery.ilike('note', `%${query}%`);
  }

  const { data, error } = await dbQuery;

  if (error) {
    console.error('select error:', error.message);
    return new Response('Internal Server Error', { status: 500 });
  }

  return new Response(JSON.stringify(data ?? []), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
