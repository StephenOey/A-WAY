import { supabase } from '../../src/lib/supabase';
import { embed, embedQuery } from '../../src/lib/voyage';
import { withCors, preflight } from '../../src/lib/cors';
import type { CreateAnnotationInput, ExpiryDays, Annotation } from '../../src/types';

export const config = { runtime: 'edge' };

const VALID_EXPIRY: ExpiryDays[] = [7, 30, 90];

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return preflight();

  // ── GET ───────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const { searchParams } = new URL(req.url);
    const query      = searchParams.get('query')?.trim() ?? '';
    const frameId    = searchParams.get('frame_id')?.trim() ?? '';
    const designerId = searchParams.get('designer_id')?.trim() ?? '';

    let results: Annotation[] = [];

    if (frameId || designerId) {
      let q = supabase.from('annotations').select('*');
      if (frameId)    q = q.eq('frame_id', frameId);
      if (designerId) q = q.eq('designer_id', designerId);
      if (query)      q = q.ilike('note', `%${query}%`);
      const { data, error } = await q;
      if (error) return withCors(new Response('Internal Server Error', { status: 500 }));
      return withCors(new Response(JSON.stringify(data ?? []), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      }));
    }

    if (query) {
      const queryEmbedding = await embedQuery(query);
      if (queryEmbedding) {
        const { data } = await supabase.rpc('match_annotations', {
          query_embedding: queryEmbedding, match_threshold: 0.7, match_count: 10,
        });
        results = (data ?? []) as Annotation[];
      }
      if (results.length === 0) {
        const { data, error } = await supabase.from('annotations').select('*')
          .gt('expires_at', new Date().toISOString())
          .ilike('note', `%${query}%`);
        if (error) return withCors(new Response('Internal Server Error', { status: 500 }));
        results = (data ?? []) as Annotation[];
      }
    } else {
      const { data, error } = await supabase.from('annotations').select('*')
        .gt('expires_at', new Date().toISOString());
      if (error) return withCors(new Response('Internal Server Error', { status: 500 }));
      results = (data ?? []) as Annotation[];
    }

    return withCors(new Response(JSON.stringify(results), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    }));
  }

  // ── POST ──────────────────────────────────────────────────────────
  if (req.method === 'POST') {
    let body: CreateAnnotationInput;
    try { body = await req.json(); }
    catch { return withCors(new Response('Invalid JSON', { status: 400 })); }

    const { designer_id, frame_id, frame_link, note, status, tags, expires_in } = body;
    if (!designer_id || !frame_id || !frame_link || !note || !status) {
      return withCors(new Response('Missing required fields', { status: 400 }));
    }
    if (status !== 'active' && status !== 'draft') {
      return withCors(new Response('Invalid status value', { status: 400 }));
    }

    const expires_at = expires_in && VALID_EXPIRY.includes(expires_in)
      ? new Date(Date.now() + expires_in * 24 * 60 * 60 * 1000).toISOString()
      : undefined;

    const sanitisedTags = Array.isArray(tags)
      ? tags.map(t => String(t).toLowerCase().trim()).filter(Boolean)
      : [];

    const embedding = await embed(note);

    const insertPayload: Record<string, unknown> = {
      designer_id, frame_id, frame_link, note, status, tags: sanitisedTags, embedding,
    };
    if (expires_at) insertPayload.expires_at = expires_at;

    const { data, error } = await supabase.from('annotations').insert(insertPayload).select().single();
    if (error) {
      console.error('insert error:', error.message);
      return withCors(new Response('Internal Server Error', { status: 500 }));
    }

    return withCors(new Response(JSON.stringify(data), {
      status: 201, headers: { 'Content-Type': 'application/json' },
    }));
  }

  return withCors(new Response('Method Not Allowed', { status: 405 }));
}
