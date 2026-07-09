-- The content RLS policies subquery public.users to check is_admin.
-- anon role needs SELECT on users so that subquery can evaluate (the
-- "profiles are publicly readable" policy already intends this).
grant select on public.users to anon;
