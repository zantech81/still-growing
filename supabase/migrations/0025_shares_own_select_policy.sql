-- Postgres RLS requires a row to satisfy a SELECT policy to be visible to
-- a DELETE's internal RETURNING/row-matching check, not just the DELETE
-- policy's USING clause. Without any SELECT policy at all, even the
-- rightful owner's own DELETE silently matched zero rows (succeeded with
-- a 200, deleted nothing).
--
-- Scoping this to "own rows only" (not "using (true)") keeps the
-- enumeration protection from 0023 fully intact: a user can now see
-- their own share rows via the API, but still cannot list or read
-- anyone else's. The public /r/[shareId] page and /api/og/* routes
-- continue to read exclusively via the service-role client regardless.
create policy "users read own shares" on public.shares
  for select using (auth.uid() = user_id);
