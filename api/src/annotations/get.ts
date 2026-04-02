import { supabase } from '../lib/supabase';
import { embedQuery } from '../lib/voyage';
import { withCors, preflight } from '../lib/cors';
import type { Annotation } from '../types';

export const config = { runtime: 'edge' };

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return preflight();
  if (req.method !== 'GET') {
    return withCors(new Response('Method Not Allowed', { status: 405 }));
  }

  const { searchParams } = new URL(req.url);
  const query      = searchParams.get('query')?.trim() ?? '';
  const frameId    = searchParams.get('frame_id')?.trim() ?? '';
  const designerId = searchParams.get('designer_id')?.trim() ?? '';

  let results: Annotation[] = [];

  // ── Frame or designer filter (skip semantic search) ──────────────
  if (frameId || designerId) {
    let q = supabase.from('annotations').select('*');

    if (frameId)    q = q.eq('frame_id', frameId);
    if (designerId) q = q.eq('designer_id', designerId);
    if (query)      q = q.ilike('note', `%${query}%`);

    const { data, error } = await q;
    if (error) {
      console.error('filter query error:', error.message);
      return withCors(new Response('Internal Server Error', { status: 500 }));
    }
    results = (data ?? []) as Annotation[];

    return withCors(
      new Response(JSON.stringify(results), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
  }

  // ── Semantic / keyword search ─────────────────────────────────────
  if (query) {
    const queryEmbedding = await embedQuery(query);

    if (queryEmbedding) {
      const { data, error } = await supabase.rpc('match_annotations', {
        query_embedding: queryEmbedding,
        match_threshold: 0.7,
        match_count: 10,
      });

      if (error) {
        console.error('vector search error:', error.message);
      } else {
        results = (data ?? []) as Annotation[];
      }
    }

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
    // No filters at all — return all active non-expired annotations
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
