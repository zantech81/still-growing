-- Reflection self-service: users can edit their own reflections (capped at
-- 3 edits total, enforced in app/api/reflections/[id]/route.ts) and delete
-- them outright (no cap). Deleting a reflection never touches user_badges
-- (no FK relationship between the two tables), so it can never revoke an
-- earned badge or re-lock a chapter's video. reactions and content_reports
-- both already reference reflections(id) with "on delete cascade" (see
-- 0001_init.sql and 0018_content_moderation.sql), so deleting a reflection
-- correctly cleans those up automatically.

alter table public.reflections
  add column edit_count integer not null default 0;

create policy "users delete own reflections" on public.reflections
  for delete using (auth.uid() = user_id);
