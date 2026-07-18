-- Migration 0004 granted only SELECT on content tables to authenticated,
-- and ALL only to service_role. Admin users are authenticated users, so the
-- "admins manage *" RLS policies can never fire without the underlying
-- role-level privilege. RLS enforces which rows; the GRANT must exist first.
--
-- Missing: INSERT, UPDATE, DELETE on collections, books, chapters, badges.
-- (SELECT was already granted; no other tables are affected.)

grant insert, update, delete on public.collections to authenticated;
grant insert, update, delete on public.books       to authenticated;
grant insert, update, delete on public.chapters    to authenticated;
grant insert, update, delete on public.badges      to authenticated;
