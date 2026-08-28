-- SECURITY FIX: "users can update own profile" (0002_rls.sql) has no
-- WITH CHECK and no column-level grant restriction -- RLS only ever
-- checked WHICH ROW (auth.uid() = id), never WHICH COLUMNS -- meaning
-- any signed-in reader could set their own is_admin (and, once added,
-- super_admin) to true via a direct PostgREST call, completely
-- bypassing every admin gate in this app. Confirmed live and reverted
-- immediately, 2026-08-28, disposable demo account, before writing this
-- fix.
--
-- Fixed at the grant layer, not by adding a WITH CHECK clause to the RLS
-- policy: a WITH CHECK here would need to compare against the row's OLD
-- value (to say "is_admin must stay whatever it already was"), which
-- means subquerying public.users from a policy ON public.users --
-- exactly the infinite-recursion trap 0035_fix_users_admin_policy_
-- recursion.sql already hit and fixed for the read side. Postgres
-- column-level grants sidestep that entirely: they're checked before
-- RLS even runs, no self-referential query involved.
revoke update on public.users from authenticated;

grant update (nickname, country_code, birth_month, birth_day, avatar_key)
  on public.users to authenticated;

-- Everything else on this table (is_admin, is_suspended, suspended_at,
-- email, systeme_contact_id, display_name, intro, last_active_at,
-- last_birthday_email_year, is_demo, avatar_color, created_at, and the
-- super_admin column added in 0053) is now only writable via the
-- service-role client -- matching how suspend-user/delete-user already
-- work (both go through createAdminClient() after their own is_admin
-- check, never the caller's own session), not a new pattern introduced
-- here. The five columns granted above are exactly the set
-- AccountForm.tsx and OnboardingForm.tsx actually write today (checked
-- directly, not guessed) -- nothing a reader currently does through
-- their own account breaks.
