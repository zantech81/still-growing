-- Purchases used to dedupe on systeme_order_id alone, which broke down
-- once a single order can contain multiple line items (e.g. the main
-- book plus a $3.99 order bump): both fire their own "New sale" webhook
-- sharing the same order.id, so the second upsert silently overwrote the
-- first row's amount/product_name/product_tag entirely instead of
-- recording a second sale. Confirmed 2026-09-19 against 5 real orders
-- already affected (12526987, 12702571, 12702741, 12702789, 12702840) --
-- each row shows only the bump's $3.99/product info; the book's own sale
-- data for those orders is gone, not merged.
--
-- sale_key is per line item, not per order: the same derived string used
-- for Meta CAPI's event_id (see lib/metaCapi.ts's MetaPurchaseEvent.eventId
-- and app/api/webhooks/systeme/route.ts) -- `${order.id}-${orderItem.id}`,
-- falling back to `${order.id}-${pricePlan.id}`, then plain order.id when
-- neither is present. This is what the webhook route upserts on, in place
-- of systeme_order_id.
alter table public.purchases add column sale_key text;

-- All 16 existing rows are test data (2026-08-29 through 2026-09-19, no
-- real launch traffic yet) -- backfilled to their own order id rather than
-- a true per-item key, since any multi-item order among them already had
-- its first item's payload overwritten and isn't recoverable. Fine for
-- test data; nothing depends on these historical rows being individually
-- correct per line item.
update public.purchases set sale_key = systeme_order_id::text where sale_key is null;

-- Plain UNIQUE: every current row has a non-null sale_key (confirmed
-- 2026-09-19), and Postgres already treats multiple NULLs as
-- non-conflicting under a plain UNIQUE constraint, so no partial index is
-- needed here.
alter table public.purchases add constraint purchases_sale_key_key unique (sale_key);

-- systeme_order_id itself stays -- still useful for "every row for this
-- order" lookups and display -- just no longer the uniqueness/upsert key.
--
-- This is DROP CONSTRAINT, not DROP INDEX: 0045_purchases.sql originally
-- created a partial unique INDEX here, but 0047_fix_purchases_upsert_conflict.sql
-- replaced it with a real UNIQUE CONSTRAINT of the same name
-- (purchases_systeme_order_id_key) -- a constraint's backing index can't
-- be dropped with DROP INDEX, only DROP CONSTRAINT. Confirmed against the
-- live database 2026-09-20, not just inferred from migration history:
-- pg_constraint shows purchases_systeme_order_id_key as contype 'u'
-- (unique constraint).
alter table public.purchases drop constraint purchases_systeme_order_id_key;
