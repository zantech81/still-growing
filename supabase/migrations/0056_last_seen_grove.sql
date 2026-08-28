-- The Grove nav icon's "unseen new post" indicator (2026-08-29) needs to
-- know when each reader last looked at /grove, compared against the
-- latest published post's published_at. A column on users, not a new
-- table: this is a single per-user scalar, the same shape as the
-- existing last_active_at/last_birthday_email_year columns already on
-- this table, not a one-to-many relationship that would warrant its own
-- table.
alter table public.users add column last_seen_grove_at timestamptz;

-- Extends the column-level grant from 0052_lock_down_users_self_update.sql
-- (additive, not a replacement -- Postgres accumulates granted columns
-- per role rather than overwriting the set) so a reader can stamp their
-- own visit, same self-service shape as nickname/country_code/etc,
-- without reopening the is_admin/super_admin escalation hole that
-- migration closed.
grant update (last_seen_grove_at) on public.users to authenticated;
