-- Public shareable links for badges, progress grids, and reflections.
-- `id` is an opaque, non-sequential nanoid (generated in
-- app/api/shares/route.ts, not by the database) so a share URL can never
-- be enumerated by guessing.
--
-- book_id is stored for every share (not just progress) even though the
-- task only specified reference_id: a progress-grid share has no single
-- reference_id, but /r/[shareId] and the OG image route both still need
-- to know which book's chapters/progress to render, so book_id is the
-- one addition beyond the literal spec, kept nullable=false since every
-- share type happens in the context of exactly one book.
create type share_type as enum ('badge', 'progress', 'reflection');

create table public.shares (
  id text primary key,
  type share_type not null,
  user_id uuid not null references public.users(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  reference_id uuid,
  created_at timestamptz not null default now()
);

alter table public.shares enable row level security;

create policy "users create own shares" on public.shares
  for insert with check (auth.uid() = user_id);

create policy "users delete own shares" on public.shares
  for delete using (auth.uid() = user_id);

-- Deliberately NO select policy or grant for anon/authenticated. A bare
-- "using (true)" SELECT policy would let anyone dump the entire shares
-- table via the public REST API (`GET /rest/v1/shares` with no filter
-- still returns every row RLS permits), which would defeat the point of
-- an unguessable id entirely. Instead, /r/[shareId] and /api/og/* read
-- shares exclusively through the server-side service-role client
-- (lib/supabase/admin.ts), which bypasses PostgREST/RLS altogether and is
-- never reachable from the browser.
grant insert, delete on public.shares to authenticated;
grant select, insert, update, delete on public.shares to service_role;
