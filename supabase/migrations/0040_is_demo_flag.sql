-- Flags permanent, intentional demo/showcase accounts (used to give the
-- app a real, populated feel when showing it around), distinct from the
-- ad-hoc pw-*/curltest*/qa-* throwaway accounts created and deleted
-- within a single verification session. Same pattern as is_admin: a
-- plain boolean on public.users, checked directly rather than inferred
-- from email pattern-matching (the email convention is still used
-- alongside this as a secondary, human-readable signal, but this column
-- is the robust source of truth for identifying and excluding these
-- accounts later).
alter table public.users
  add column is_demo boolean not null default false;
