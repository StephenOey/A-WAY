import { supabase } from '../lib/supabase';
import { computeExpiresAt } from '../lib/expiry';
import type { CreateAnnotationInput } from '@a-way/shared';

export const config = { runtime: 'edge' };

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  let body: CreateAnnotationInput;
  try {
    body = await req.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const { designer_id, frame_id, frame_link, note, status } = body;
  if (!designer_id || !frame_id || !frame_link || !note || !status) {
    return new Response('Missing required fields', { status: 400 });
  }
  if (status !== 'active' && status !== 'draft') {
    return new Response('Invalid status value', { status: 400 });
  }

  // expires_at is a generated column in Postgres — do NOT insert it
  const { data, error } = await supabase
    .from('annotations')
    .insert({ designer_id, frame_id, frame_link, note, status })
    .select()
    .single();

  if (error) {
    console.error('insert error:', error.message);
    return new Response('Internal Server Error', { status: 500 });
  }

  return new Response(JSON.stringify(data), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
}
