import { supabase } from '../lib/supabase';
import { embedQuery } from '../lib/voyage';
import { withCors, preflight } from '../lib/cors';
import type { Annotation } from '@a-way/shared';

export const config = { runtime: 'edge' };

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return preflight();
  if (req.method !== 'GET') {
    return withCors(new Response('Method Not Allowed', { status: 405 }));
  }

  const { searchParams } = new URL(req.url);
  const query = searchParams.get('query')?.trim() ?? '';

  let results: Annotation[] = [];

  if (query) {
    // Attempt semantic vector search first (requires VOYAGE_API_KEY)
    const queryEmbedding = await embedQuery(query);

    if (queryEmbedding) {
      const { data, error } = await supabase.rpc('match_annotations', {
        query_embedding: queryEmbedding,
        match_threshold: 0.7,
        match_count: 10,
      });

      if (error) {
        console.error('vector search error:', error.message);
        // Fall through to keyword search
      } else {
        results = (data ?? []) as Annotation[];
      }
    }

    // Fallback: keyword search when embedding is unavailable or RPC fails
    if (results.length === 0) {
      const { data, error } = await supabase
        .from('annotations')
        .select('*')
        .eq('status', 'active')
        .gt('expires_at', new Date().toISOString())
        .ilike('note', `%${query}%`);

      if (error) {
        console.error('keyword search error:', error.message);
        return withCors(new Response('Internal Server Error', { status: 500 }));
      }
      results = (data ?? []) as Annotation[];
    }
  } else {
    // No query — return all active, non-expired annotations
    const { data, error } = await supabase
      .from('annotations')
      .select('*')
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString());

    if (error) {
      console.error('select error:', error.message);
      return withCors(new Response('Internal Server Error', { status: 500 }));
    }
    results = (data ?? []) as Annotation[];
  }

  return withCors(
    new Response(JSON.stringify(results), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  );
}
