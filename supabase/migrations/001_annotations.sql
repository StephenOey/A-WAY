-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ── Table ────────────────────────────────────────────────────────────────────
create table public.annotations (
  id           uuid primary key default uuid_generate_v4(),
  designer_id  text not null,
  frame_id     text not null,
  frame_link   text not null,
  note         text not null,
  status       text not null check (status in ('active', 'draft')),
  created_at   timestamptz not null default now(),
  expires_at   timestamptz not null default (now() + interval '30 days')
);

-- ── Row-level security ───────────────────────────────────────────────────────
alter table public.annotations enable row level security;

create policy "Designers can select their own annotations"
  on public.annotations
  for select
  using (auth.uid()::text = designer_id);

create policy "Designers can insert their own annotations"
  on public.annotations
  for insert
  with check (auth.uid()::text = designer_id);

create policy "Designers can update their own annotations"
  on public.annotations
  for update
  using (auth.uid()::text = designer_id)
  with check (auth.uid()::text = designer_id);

create policy "Designers can delete their own annotations"
  on public.annotations
  for delete
  using (auth.uid()::text = designer_id);
