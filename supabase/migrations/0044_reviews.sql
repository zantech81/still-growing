-- Public marketing reviews/testimonials, deliberately separate from the
-- Circle's reflections: a reflection is a private-by-default, community-
-- facing space (see app/circle/page.tsx's own disclaimer) that must never
-- be repurposed for marketing, while a review is explicitly submitted for
-- possible public/marketing use (see the notice in components/
-- ReviewForm.tsx) and goes through an admin approval queue first.
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  text text not null,
  display_name_override text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  is_featured boolean not null default false,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.users(id)
);

alter table public.reviews enable row level security;

create policy "users create own reviews" on public.reviews
  for insert with check (auth.uid() = user_id);

-- A user can see their own review (any status, so they know if it's still
-- pending) but there is deliberately NO "using (true)" / public select
-- policy here, same reasoning as 0023_shares.sql's shares table: a bare
-- public policy would let anyone dump every review (including pending/
-- rejected ones, and the real user_id) via the PostgREST API. Public,
-- approved-only reads go exclusively through app/api/reviews/public/
-- route.ts's service-role client, which bypasses RLS and selects only
-- the specific columns meant to ever be public.
create policy "users read own reviews" on public.reviews
  for select using (
    auth.uid() = user_id
    or exists (select 1 from public.users where id = auth.uid() and is_admin = true)
  );

create policy "admins moderate reviews" on public.reviews
  for update using (
    exists (select 1 from public.users where id = auth.uid() and is_admin = true)
  );

-- update is granted broadly here too (not just select/insert), same
-- reasoning as 0043_self_harm_flags.sql: the "admins moderate reviews"
-- RLS policy needs a matching base grant for the `authenticated` role to
-- take effect at all, since an admin approving/rejecting a review does so
-- under their own regular session, not the service-role client.
grant select, insert, update on public.reviews to authenticated;
grant select, insert, update on public.reviews to service_role;
