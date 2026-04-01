import { supabase } from '../lib/supabase';
import { embed } from '../lib/voyage';
import { withCors, preflight } from '../lib/cors';
import type { CreateAnnotationInput } from '../types';

export const config = { runtime: 'edge' };

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

  const { designer_id, frame_id, frame_link, note, status } = body;
  if (!designer_id || !frame_id || !frame_link || !note || !status) {
    return withCors(new Response('Missing required fields', { status: 400 }));
  }
  if (status !== 'active' && status !== 'draft') {
    return withCors(new Response('Invalid status value', { status: 400 }));
  }

  // Generate embedding — null if VOYAGE_API_KEY is absent (graceful degradation)
  const embedding = await embed(note);

  // expires_at is a generated column — do not insert it
  const { data, error } = await supabase
    .from('annotations')
    .insert({ designer_id, frame_id, frame_link, note, status, embedding })
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
