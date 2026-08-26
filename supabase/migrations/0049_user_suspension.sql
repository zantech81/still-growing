-- Admin-facing suspend/unsuspend (reversible) and hard delete (via
-- supabase.auth.admin.deleteUser, no schema change needed for that side --
-- every user-linked table already cascades from public.users, which
-- cascades from auth.users). These two columns are the UI's source of
-- truth for suspension state; the actual sign-in block is enforced at the
-- Supabase Auth layer itself (auth.users.banned_until, set via
-- auth.admin.updateUserById's ban_duration), not by these columns being
-- read anywhere in the app -- see app/api/admin/suspend-user/route.ts.
alter table public.users
  add column is_suspended boolean not null default false,
  add column suspended_at timestamptz;
