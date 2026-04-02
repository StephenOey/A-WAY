import { supabase } from '../../src/lib/supabase';
import { withCors, preflight } from '../../src/lib/cors';
import type { UpdateAnnotationInput } from '../../src/types';

export const config = { runtime: 'edge' };

function getId(req: Request): string | null {
  const segments = new URL(req.url).pathname.split('/').filter(Boolean);
  return segments[segments.length - 1] ?? null;
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return preflight();

  const id = getId(req);
  if (!id) return withCors(new Response('Missing id', { status: 400 }));

  // ── DELETE ────────────────────────────────────────────────────────
  if (req.method === 'DELETE') {
    const { error } = await supabase.from('annotations').delete().eq('id', id);
    if (error) return withCors(new Response('Internal Server Error', { status: 500 }));
    return withCors(new Response(null, { status: 204 }));
  }

  // ── PUT ───────────────────────────────────────────────────────────
  if (req.method === 'PUT') {
    let body: UpdateAnnotationInput;
    try { body = await req.json(); }
    catch { return withCors(new Response('Invalid JSON', { status: 400 })); }

    const { note, status, tags } = body;
    if (status && status !== 'active' && status !== 'draft') {
      return withCors(new Response('Invalid status value', { status: 400 }));
    }

    const updates: Record<string, unknown> = {};
    if (note   !== undefined) updates.note   = note;
    if (status !== undefined) updates.status = status;
    if (tags   !== undefined) {
      updates.tags = Array.isArray(tags)
        ? tags.map(t => String(t).toLowerCase().trim()).filter(Boolean)
        : [];
    }

    if (Object.keys(updates).length === 0) {
      return withCors(new Response('No fields to update', { status: 400 }));
    }

    const { data, error } = await supabase.from('annotations').update(updates)
      .eq('id', id).select().single();
    if (error) return withCors(new Response('Internal Server Error', { status: 500 }));

    return withCors(new Response(JSON.stringify(data), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    }));
  }

  return withCors(new Response('Method Not Allowed', { status: 405 }));
}
