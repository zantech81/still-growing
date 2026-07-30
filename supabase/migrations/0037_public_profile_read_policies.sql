-- Profile pages need to show a VIEWED user's books-unlocked list and
-- badge summary, not just the viewer's own. Both tables currently only
-- have a single "for all using (auth.uid() = user_id)" policy (own row,
-- every command). Adding a separate public SELECT policy alongside it
-- doesn't loosen writes at all -- INSERT/UPDATE/DELETE still only ever
-- match the existing owner-only policy; SELECT now matches either
-- policy (Postgres OR's same-command policies together), same pattern
-- already used for reflections ("reflections are readable if not
-- hidden" for select, separate from "users edit own reflections" for
-- update).
--
-- Genuinely public read, not column-scoped like users: neither table
-- has any column resembling the email/birthdate-level sensitivity that
-- motivated the public_profiles view -- start date, current chapter,
-- badges earned, which specific badge/book -- all fine for anyone to
-- see, same as connections and reactions already are.

-- No new grants needed: 0004_grants.sql already granted authenticated
-- full select/insert/update/delete on both tables; RLS is what was
-- actually restricting visibility, not the grant.
create policy "user_books are publicly readable" on public.user_books
  for select using (true);

create policy "user_badges are publicly readable" on public.user_badges
  for select using (true);
