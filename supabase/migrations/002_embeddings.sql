-- Enable pgvector extension for semantic search
create extension if not exists vector;

-- Add embedding column to annotations table
-- voyage-3 produces 1024-dimensional vectors
alter table public.annotations
  add column if not exists embedding vector(1024);

-- Index for fast approximate nearest-neighbour search (cosine distance)
create index if not exists annotations_embedding_idx
  on public.annotations
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- Helper function used by GET /annotations?query=
-- Returns annotations ordered by cosine similarity to the query embedding.
create or replace function match_annotations(
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
