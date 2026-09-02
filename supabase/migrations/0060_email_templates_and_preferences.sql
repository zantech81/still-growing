-- Admin-editable copy for the app's own 6 Resend-based transactional
-- emails (lib/sendgrid.ts), plus reader-facing opt-out preferences for
-- the 5 of those that are actually reader-facing. Carried-over punch-
-- list item from 2026-08-15, built now against the real current set of
-- email types (Grove and unlock-alert didn't exist when this was first
-- designed). Explicitly NOT in scope: Supabase Auth's own sign-in
-- templates (Dashboard/Management API only, kept out per an earlier
-- decision on this project) and Systeme.io's marketing campaigns
-- (a separate system entirely).

-- One row per email type, not a JSONB blob and not raw HTML: admins get
-- to edit copy, not layout -- lib/emailTemplates.ts's wrap()/btn() stay
-- code-controlled, and these four columns are exactly the content that
-- plugs into them (subject, the h1, the main paragraph(s), the button's
-- label). href/user-id/etc. stay code-generated (structural, not copy).
-- `type` is the primary key rather than a separate uuid id: there is,
-- and will only ever be, exactly one row per type, same one-row-per-
-- concept simplicity as site_settings' singleton (0051), just six rows
-- instead of one. All four content columns start null (see the seed
-- insert below) -- lib/emailTemplates.ts's resolveEmailTemplate() falls
-- back to a hardcoded default per FIELD, not per row, so an admin who
-- only wants to change a subject line doesn't have to also duplicate
-- the body copy into their row just to save that one change.
create table public.email_templates (
  type text primary key check (
    type in ('reaction', 'root_for', 'new_book', 'birthday', 'unlock_alert', 'grove_post')
  ),
  subject text,
  heading text,
  body text,
  button_label text,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.users(id) on delete set null
);

insert into public.email_templates (type) values
  ('reaction'), ('root_for'), ('new_book'), ('birthday'), ('unlock_alert'), ('grove_post');

alter table public.email_templates enable row level security;

-- Admin-only in both directions -- unlike site_settings (some of which,
-- like maintenance_mode, has to be publicly readable for
-- middleware.ts's own anonymous-visitor check), nothing here is ever
-- read by a reader's own session; the real send path always reads
-- through the service-role client (lib/sendgrid.ts's getEmailTemplate),
-- and the admin editor page reads through the admin's own session,
-- which this policy already covers.
create policy "admins manage email templates" on public.email_templates
  for all using (
    exists (select 1 from public.users where id = auth.uid() and is_admin = true)
  );

-- No insert/delete grant: same reasoning as site_settings (0051) -- the
-- six rows are seeded above and only ever updated.
grant select, update on public.email_templates to authenticated;
grant all on public.email_templates to service_role;

-- Reader-facing opt-out preferences, one flat boolean per email type --
-- matches this table's own existing convention for per-user scalars
-- (last_seen_grove_at added the same way in 0056, is_admin/is_suspended
-- before it) rather than a single notification_preferences jsonb
-- column. A jsonb column would save a migration if a 7th email type
-- ever needs a toggle, but for a small, well-enumerated, already-fixed
-- set of 5 (unlock_alert is admin-only, no reader toggle needed for it)
-- flat columns stay self-documenting, keep normal SQL/RLS/grant
-- tooling working without jsonb-path plumbing, and match how every
-- other reader-facing preference on this table is already stored.
-- Defaults to true (opt-out, not opt-in): this is a new feature, not a
-- fix for something broken, so it must not go quiet for every existing
-- reader who never touches the new setting.
alter table public.users
  add column notify_reaction boolean not null default true,
  add column notify_root_for boolean not null default true,
  add column notify_new_book boolean not null default true,
  add column notify_birthday boolean not null default true,
  add column notify_grove_post boolean not null default true;

-- Extends the column-level grant from 0052_lock_down_users_self_update.sql
-- (additive, same as 0056's last_seen_grove_at grant) so a reader can
-- save their own preference toggles without needing the service-role
-- client -- without this, AccountForm-style client-side saves would
-- fail silently at the grant layer, not with a visible error.
grant update (notify_reaction, notify_root_for, notify_new_book, notify_birthday, notify_grove_post)
  on public.users to authenticated;
