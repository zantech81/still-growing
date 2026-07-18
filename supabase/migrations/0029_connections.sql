-- "Root for" connections: a lightweight, directional follow-style
-- relationship between two readers, distinct from reactions (which are
-- per-reflection, not per-person) and from allow_external_share (which is
-- about content, not people). The Growing page counts DISTINCT people
-- connected in either direction as one merged pool, so the direction
-- itself is only needed to know who's allowed to create/delete a given
-- row, not to change how it's displayed.
create table public.connections (
  id uuid primary key default gen_random_uuid(),
  rooter_id uuid not null references public.users(id) on delete cascade,
  rooted_for_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (rooter_id, rooted_for_id),
  check (rooter_id <> rooted_for_id)
);

create index connections_rooted_for_id_idx on public.connections (rooted_for_id);
create index connections_rooter_id_idx on public.connections (rooter_id);

alter table public.connections enable row level security;

-- Readable by anyone: unlike shares (unguessable-id-gated), connection
-- counts and the tree itself are meant to be openly visible, the same way
-- hearts_count already is.
create policy "connections are publicly readable" on public.connections
  for select using (true);

create policy "users create own connections" on public.connections
  for insert with check (auth.uid() = rooter_id);

create policy "users delete own connections" on public.connections
  for delete using (auth.uid() = rooter_id);

grant select on public.connections to anon, authenticated;
grant insert, delete on public.connections to authenticated;
grant select, insert, update, delete on public.connections to service_role;
