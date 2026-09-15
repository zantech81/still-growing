-- Admin-only email sent on every Systeme.io "Sale cancelled" event (see
-- app/api/webhooks/systeme/route.ts and lib/refunds.ts), for the 7-day
-- money-back guarantee added 2026-09-15. A manual backstop regardless of
-- whether automatic book_unlocks revocation succeeded -- gift purchases in
-- particular can't be reliably auto-revoked (the purchaser's email and the
-- actual redeemer's account are two different, unlinked people in this
-- system), so an admin needs to see every refund either way. Same
-- admin-only pattern as 'unlock_alert' (0060).
alter table public.email_templates drop constraint email_templates_type_check;
alter table public.email_templates add constraint email_templates_type_check
  check (type in ('reaction', 'root_for', 'new_book', 'birthday', 'unlock_alert', 'grove_post', 'refund_notification'));

insert into public.email_templates (type) values ('refund_notification');
