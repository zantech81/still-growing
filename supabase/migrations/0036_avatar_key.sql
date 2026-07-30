-- Predefined illustrated avatar (a fixed key from lib/avatars.ts's set,
-- not a photo upload -- deliberately avoided so this needs no image
-- moderation). Nullable: falls back to country flag, then nickname
-- initials, if unset (components/Avatar.tsx).
alter table public.users add column avatar_key text;

-- CREATE OR REPLACE, not a fresh create: 0033_users_rls_column_scoping.sql
-- already created this view before avatar_key existed. Same safe-subset
-- principle, one more column -- appended at the end of the select list,
-- not inserted in the middle: Postgres only allows CREATE OR REPLACE VIEW
-- to add columns after the existing ones, never reorder or insert.
create or replace view public.public_profiles as
  select id, nickname, display_name, avatar_color, country_code, avatar_key
  from public.users;
