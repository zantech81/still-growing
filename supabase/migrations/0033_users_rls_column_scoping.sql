-- Closes a genuine pre-existing gap: "profiles are publicly readable"
-- (0002_rls.sql) used `for select using (true)`, which grants every
-- COLUMN of every user's row to any authenticated caller, not just the
-- safe subset every existing call site actually uses (nickname,
-- display_name, avatar_color, country_code). Row Level Security can only
-- restrict ROWS, not columns -- there is no way to write a policy that
-- says "this caller may read these columns but not those" -- so the safe
-- public subset is exposed through a view instead.
--
-- Views run with the definer's privileges for RLS purposes by default
-- (pre-PG15 behavior, still Supabase's default: security_invoker is
-- deliberately NOT set here), so this view keeps showing every user's
-- safe columns to any authenticated caller even after the base table's
-- own policy is tightened below. Direct queries against public.users
-- itself are now restricted to the caller's own row (or an admin).

drop policy "profiles are publicly readable" on public.users;

create policy "users read own full profile" on public.users
  for select using (auth.uid() = id);

-- Every existing admin-check subquery elsewhere in this schema
-- (`exists (select 1 from public.users where id = auth.uid() and is_admin)`)
-- only ever looks up the CALLER's own row, which "users read own full
-- profile" above already permits -- so none of those are affected by
-- this change. This policy exists for the cases where an admin needs to
-- read a *different* user's full row (the admin members list, the
-- moderation queue's author lookup), which the own-row policy alone
-- would no longer allow once the old `using (true)` policy is gone.
create policy "admins read all profiles" on public.users
  for select using (
    exists (select 1 from public.users u where u.id = auth.uid() and u.is_admin)
  );

-- Safe public subset only. avatar_key isn't added until the avatar
-- feature's own migration -- this view gets CREATE OR REPLACE'd there
-- once that column exists, not blocked on it now.
create view public.public_profiles as
  select id, nickname, display_name, avatar_color, country_code
  from public.users;

grant select on public.public_profiles to authenticated;
