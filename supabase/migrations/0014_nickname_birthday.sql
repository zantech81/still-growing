-- Public-facing name shown in the Circle; replaces display_name in public UI.
-- Case-insensitive unique: "Alice" and "alice" can't coexist.
alter table public.users add column nickname text;
create unique index users_nickname_lower_key on public.users (lower(nickname));

-- Birthday: month + day only; year is never collected.
alter table public.users add column birth_month smallint check (birth_month between 1 and 12);
alter table public.users add column birth_day   smallint check (birth_day   between 1 and 31);

-- Birthday cron dedup: tracks which calendar year a birthday email was last sent.
alter table public.users add column last_birthday_email_year integer;
