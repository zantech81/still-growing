-- Second admin tier: every super_admin is expected to also be an admin
-- (not enforced by a constraint -- nothing in the app checks super_admin
-- without the caller already having passed app/admin/layout.tsx's
-- is_admin gate to reach an admin page at all). Gates two specific
-- capabilities -- promoting/demoting other accounts to admin, and
-- account delete/suspend/ban (shipped in 674766f) -- everything else
-- already gated to is_admin (books, collections, circle moderation,
-- reviews, self-harm flags, maintenance mode, the Grove) stays available
-- to any admin, unchanged.
alter table public.users add column super_admin boolean not null default false;

-- Confirmed 2026-08-28: zantech@gmail.com is the real account this
-- session is running as (matches the session's own user context,
-- already is_admin = true) -- not a guess.
update public.users set super_admin = true where email = 'zantech@gmail.com';
