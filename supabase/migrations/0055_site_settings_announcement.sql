-- Extends site_settings (52f867f) rather than a new table: an
-- announcement is the same shape of thing maintenance mode already is --
-- one admin-controlled sitewide flag + message, singleton, no
-- history/queue needed -- so it inherits the same RLS/grants for free
-- instead of duplicating them on a second one-row table. announcement_link
-- is separate from maintenance_message's plain-text field since an
-- announcement optionally points somewhere (a new Grove post) that a
-- maintenance notice never does.
alter table public.site_settings
  add column announcement_active boolean not null default false,
  add column announcement_message text,
  add column announcement_link text;
