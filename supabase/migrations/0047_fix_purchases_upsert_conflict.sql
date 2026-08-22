-- Fixes Postgres error 42P10 ("there is no unique or exclusion constraint
-- matching the ON CONFLICT specification"), which has been failing every
-- real webhook delivery with a non-null order id since the route went
-- live: app/api/webhooks/systeme/route.ts's
-- upsert(row, { onConflict: "systeme_order_id" }) needs a plain unique
-- constraint to target, and 0045_purchases.sql only created a PARTIAL
-- unique index (where systeme_order_id is not null), which a plain-column
-- ON CONFLICT can't use for inference.
--
-- The "partial, so multiple null order ids are allowed" reasoning behind
-- that partial index was unnecessary in the first place: Postgres already
-- treats every NULL as distinct from every other NULL under a plain
-- UNIQUE constraint, so switching to a real constraint doesn't reintroduce
-- the problem it was trying to avoid.
drop index if exists public.purchases_systeme_order_id_key;
alter table public.purchases
  add constraint purchases_systeme_order_id_key unique (systeme_order_id);
