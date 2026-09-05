-- Real announcement queue, replacing the site_settings singleton
-- (0055_site_settings_announcement.sql) for every new write path.
-- site_settings.announcement_active/message/link stay in place (a
-- separate, lower-risk cleanup for later if wanted) but nothing writes to
-- them after this migration -- both Grove-post-publish paths
-- (GrovePostForm.tsx's immediate publish, and the new scheduled-publish
-- cron) and the manual admin queue manager insert rows here instead, and
-- AppShell.tsx's fetchAppShellData() reads from here, not site_settings.
--
-- Unlike that singleton, an announcement here can be scoped to a set of
-- countries (country_codes, matching users.country_code -- the same
-- 2-letter codes lib/countries.ts already uses for the Growing page's
-- country grid) rather than always sitewide. null/empty country_codes
-- means sitewide, same "absence of a restriction is the least-scoped
-- case" convention as every other nullable filter column in this schema.
--
-- status is a real state machine, not just an active/inactive flag,
-- because a row now has a lifecycle the old boolean never needed:
-- scheduled (created, starts_at still in the future) -> active (the daily
-- cron flipped it once starts_at arrived, or an admin created it with
-- starts_at already <= today) -> ended (ends_at passed, or an admin ended
-- it early) or cancelled (an admin cancelled it before it ever went
-- live). day-precision only (starts_at/ends_at are date, not timestamptz)
-- -- matches the decision to keep this cron once-daily, no time-of-day
-- precision for this pass.
create table public.scheduled_announcements (
  id uuid primary key default gen_random_uuid(),
  message text not null,
  link text,
  country_codes text[],
  starts_at date not null,
  ends_at date,
  status text not null default 'scheduled' check (status in ('scheduled', 'active', 'ended', 'cancelled')),
  created_at timestamptz not null default now(),
  created_by uuid references public.users(id) on delete set null
);

-- Every signed-in page's AppShell read goes through this on nearly every
-- request, same traffic shape as site_settings' own maintenance-mode
-- check -- worth a covering index for the cron's own day-boundary scans
-- and the read path's `status = 'active'` filter.
create index scheduled_announcements_status_idx on public.scheduled_announcements (status);

alter table public.scheduled_announcements enable row level security;

-- Publicly readable, same reasoning as site_settings' own migration
-- comment: nothing in an announcement's content is sensitive, and this
-- keeps the door open for a signed-out banner later without a policy
-- change, even though AppShell.tsx today only reads this for signed-in
-- viewers.
create policy "scheduled announcements are publicly readable" on public.scheduled_announcements
  for select using (true);

-- Any admin, not just super_admin -- matches grove_posts' own policy
-- comment: this isn't one of the two capabilities scoped to the
-- super-admin tier.
create policy "admins manage scheduled announcements" on public.scheduled_announcements
  for all using (
    exists (select 1 from public.users where id = auth.uid() and is_admin)
  );

grant select on public.scheduled_announcements to anon, authenticated;
grant insert, update, delete on public.scheduled_announcements to authenticated;
grant all on public.scheduled_announcements to service_role;
