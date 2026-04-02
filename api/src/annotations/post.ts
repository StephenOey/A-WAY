import { supabase } from '../lib/supabase';
import { embed } from '../lib/voyage';
import { withCors, preflight } from '../lib/cors';
import type { CreateAnnotationInput, ExpiryDays } from '../types';

export const config = { runtime: 'edge' };

const VALID_EXPIRY: ExpiryDays[] = [7, 30, 90];

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return preflight();
  if (req.method !== 'POST') {
    return withCors(new Response('Method Not Allowed', { status: 405 }));
  }

  let body: CreateAnnotationInput;
  try {
    body = await req.json();
  } catch {
    return withCors(new Response('Invalid JSON', { status: 400 }));
  }

  const { designer_id, frame_id, frame_link, note, status, tags, expires_in } = body;
  if (!designer_id || !frame_id || !frame_link || !note || !status) {
    return withCors(new Response('Missing required fields', { status: 400 }));
  }
  if (status !== 'active' && status !== 'draft') {
    return withCors(new Response('Invalid status value', { status: 400 }));
  }

  // Compute custom expiry if provided
  const expires_at = expires_in && VALID_EXPIRY.includes(expires_in)
    ? new Date(Date.now() + expires_in * 24 * 60 * 60 * 1000).toISOString()
    : undefined;

  // Sanitise tags — lowercase, no empty strings
  const sanitisedTags = Array.isArray(tags)
    ? tags.map(t => String(t).toLowerCase().trim()).filter(Boolean)
    : [];

  const embedding = await embed(note);

  const insertPayload: Record<string, unknown> = {
    designer_id, frame_id, frame_link, note, status,
    tags: sanitisedTags,
    embedding,
  };
  if (expires_at) insertPayload.expires_at = expires_at;

  const { data, error } = await supabase
    .from('annotations')
    .insert(insertPayload)
    .select()
    .single();

  if (error) {
    console.error('insert error:', error.message);
    return withCors(new Response('Internal Server Error', { status: 500 }));
  }

  return withCors(
    new Response(JSON.stringify(data), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    })
  );
}
