-- Self-harm content filter: when moderateReflection() (lib/moderation.ts)
-- detects self-harm language in a reflection or review, the submission is
-- hard-blocked (never saved) and this table logs what was written so an
-- admin can follow up directly with the reader, separate from ordinary
-- content moderation (0018_content_moderation.sql's content_reports/
-- flag_reason, which is about *hiding* content other readers flagged, not
-- a wellbeing check-in).
--
-- book_id/chapter_id are nullable: a review-triggered flag (app/api/
-- reviews/route.ts) has no chapter context at all.
create table public.self_harm_flags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  book_id uuid references public.books(id),
  chapter_id uuid references public.chapters(id),
  flagged_text text not null,
  created_at timestamptz not null default now(),
  acknowledged boolean not null default false,
  acknowledged_at timestamptz,
  acknowledged_by uuid references public.users(id)
);

alter table public.self_harm_flags enable row level security;

-- A user can log their own flag (the API route inserts under their own
-- session, never the admin client) but can never read it back -- this
-- table is a one-way admin mailbox, not something the author should see
-- reflected in their own UI.
create policy "users log own flag" on public.self_harm_flags
  for insert with check (auth.uid() = user_id);

-- Same is_admin subquery pattern as 0018_content_moderation.sql's
-- "admins read all reports" policy.
create policy "admins read all flags" on public.self_harm_flags
  for select using (
    exists (select 1 from public.users where id = auth.uid() and is_admin = true)
  );
create policy "admins acknowledge flags" on public.self_harm_flags
  for update using (
    exists (select 1 from public.users where id = auth.uid() and is_admin = true)
  );

-- select/update are granted broadly to `authenticated` here (not just
-- insert) because the admin-only RLS policies above need a matching base
-- grant to take effect at all -- admins reading/acknowledging this table
-- are ordinary authenticated users (is_admin = true), not service_role.
-- The RLS policies, not this grant, are what actually keeps a non-admin
-- from ever seeing another row (or their own). No delete policy or grant
-- for anyone: these records are never meant to be removable, only
-- acknowledged.
grant select, insert, update on public.self_harm_flags to authenticated;
grant select, insert, update on public.self_harm_flags to service_role;
