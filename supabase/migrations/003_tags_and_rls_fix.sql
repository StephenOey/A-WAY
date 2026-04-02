-- ── Fix RLS policies ─────────────────────────────────────────────────────────
-- The API uses the anon key without Supabase Auth, so auth.uid() is always null.
-- The original per-designer policies block all API operations.
-- Replace with permissive policies; the API enforces access control at app layer.
drop policy if exists "Designers can select their own annotations" on public.annotations;
drop policy if exists "Designers can insert their own annotations" on public.annotations;
drop policy if exists "Designers can update their own annotations" on public.annotations;
drop policy if exists "Designers can delete their own annotations" on public.annotations;

create policy "API full access"
  on public.annotations
  for all
  using (true)
  with check (true);

-- ── Add tags column ───────────────────────────────────────────────────────────
alter table public.annotations
  add column if not exists tags text[] not null default '{}';

-- ── Update match_annotations RPC to return tags ───────────────────────────────
drop function if exists match_annotations(vector, float, int);

create function match_annotations(
  query_embedding  vector(1024),
  match_threshold  float    default 0.7,
  match_count      int      default 10
)
returns table (
  id          uuid,
  designer_id text,
  frame_id    text,
  frame_link  text,
  note        text,
  status      text,
  tags        text[],
  created_at  timestamptz,
  expires_at  timestamptz,
  similarity  float
)
language sql stable
as $$
  select
    a.id,
    a.designer_id,
    a.frame_id,
    a.frame_link,
    a.note,
    a.status,
    a.tags,
    a.created_at,
    a.expires_at,
    1 - (a.embedding <=> query_embedding) as similarity
  from public.annotations a
  where
    a.status = 'active'
    and a.expires_at > now()
    and a.embedding is not null
    and 1 - (a.embedding <=> query_embedding) > match_threshold
  order by a.embedding <=> query_embedding
  limit match_count;
$$;
