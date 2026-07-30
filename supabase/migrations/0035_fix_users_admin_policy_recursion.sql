-- 0033's "admins read all profiles" policy used a raw
-- `exists (select 1 from public.users where id = auth.uid() and is_admin)`
-- subquery -- the same pattern already used safely everywhere else in
-- this schema (books, chapters, badges, ...), but those are policies on
-- OTHER tables, where the subquery against users terminates normally.
-- Here the policy is defined ON users itself, so evaluating it requires
-- re-querying users, which re-triggers this same policy, forever:
-- confirmed live as Postgres error 42P17 "infinite recursion detected in
-- policy for relation users", breaking every query against the table,
-- including a user reading their own row.
--
-- Fix: the same SECURITY DEFINER escape hatch this schema already uses
-- for exactly this class of problem (see handle_new_user in 0001_init.sql,
-- check_reflection_reports in 0018_content_moderation.sql). A SECURITY
-- DEFINER function's internal query runs with the function owner's
-- privileges, bypassing RLS entirely rather than re-evaluating it -
-- breaking the recursion.

create or replace function public.is_admin(uid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce((select is_admin from public.users where id = uid), false);
$$;

drop policy "admins read all profiles" on public.users;

create policy "admins read all profiles" on public.users
  for select using (public.is_admin(auth.uid()));
