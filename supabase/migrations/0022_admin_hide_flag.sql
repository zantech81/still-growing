-- Distinguishes an admin's manual "Hide" action from an author's own
-- private choice (flag_reason IS NULL). Without this, ModerationList.tsx
-- can't tell the two apart: both leave flag_reason NULL today, and once
-- private reflections lose their "Unhide" button (see that component),
-- an admin-hidden reflection would be stranded with no way to undo it.
--
-- IF EXISTS guards the drop in case the default-naming assumption about
-- the constraint added in 0018_content_moderation.sql is ever wrong; the
-- migration is still safe (and self-verifying, since an app-level insert
-- of flag_reason = 'admin' will fail loudly if this didn't take effect).
alter table public.reflections
  drop constraint if exists reflections_flag_reason_check;

alter table public.reflections
  add constraint reflections_flag_reason_check
  check (flag_reason is null or flag_reason in ('spam', 'reported', 'admin'));
