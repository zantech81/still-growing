-- /u/[userId] is meant to be a genuinely public profile page (a stranger
-- clicking a shared link, or a Circle post's author name, should see it
-- without signing in first, same as /r/[shareId] already works). The
-- route-level auth gate that forced a login is being removed separately
-- (middleware.ts, app/u/[userId]/page.tsx); this migration is the other
-- half of that fix.
--
-- Every RLS policy the profile page depends on is already correctly
-- scoped for an anonymous reader: public_profiles exposes only the safe
-- column subset (0033_users_rls_column_scoping.sql), user_books/
-- user_badges have "for select using (true)" (0037_public_profile_read_
-- policies.sql), profile_pins has its own public select policy
-- (0038_profile_pins.sql), and reflections' existing policy
-- ("is_hidden = false or auth.uid() = user_id", 0002_rls.sql) resolves to
-- "is_hidden = false" for a signed-out reader since auth.uid() is null --
-- exactly the public subset, nothing more.
--
-- What was actually missing is narrower than RLS: none of these five
-- were ever GRANTed to the anon role, only to authenticated (and
-- service_role, which bypasses RLS entirely and didn't need this
-- either). RLS policies only ever narrow what a grant already allows --
-- they can't substitute for a missing grant -- so anon requests were
-- hitting "permission denied" before RLS was ever evaluated. This adds
-- exactly the one missing grant per table, no RLS/policy changes at all,
-- so the actual visibility rules above are unchanged by this migration.
grant select on public.public_profiles to anon;
grant select on public.user_books to anon;
grant select on public.user_badges to anon;
grant select on public.reflections to anon;
grant select on public.profile_pins to anon;
