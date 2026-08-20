-- Purchase records ingested from Systeme.io's "new sale" / "canceled sale
-- or refund" webhooks (app/api/webhooks/systeme/route.ts). This is the
-- real-sales side of reconciling against book_unlocks
-- (0007_book_redemption_codes.sql) -- GROWBABY is a single shared code
-- across every buyer, so the unlock count alone can't tell a legitimate
-- buyer from someone who got a leaked/pirated copy of the book; comparing
-- it against actual purchase counts here can at least surface the gap.
--
-- systeme_order_id is nullable (not just unique) on purpose: the exact
-- payload shape wasn't confirmed against Systeme.io's official developer
-- docs when this was written (only public help articles + a third-party
-- integration guide were available), so a real event is stored even if
-- the order id can't be found where expected -- see the extraction
-- comments in the webhook route for detail. raw_payload always keeps the
-- full event regardless of whether the typed columns extracted correctly.
create table public.purchases (
  id               uuid        primary key default gen_random_uuid(),
  systeme_order_id text,
  email            text,
  product_name     text,
  amount           numeric,
  currency         text,
  event_type       text        not null, -- raw "type" field from the payload, e.g. "customer.sale.completed"
  status           text        not null default 'completed', -- 'completed' | 'refunded'
  raw_payload      jsonb       not null,
  created_at       timestamptz not null default now(),
  refunded_at      timestamptz
);

-- Partial unique index (not a plain UNIQUE column constraint) so multiple
-- rows with a null order id are allowed, but a real order id still dedupes
-- -- lets the webhook route upsert safely on conflict when the id is
-- present, without failing outright if it's ever missing.
create unique index purchases_systeme_order_id_key on public.purchases (systeme_order_id) where systeme_order_id is not null;
create index purchases_email_idx on public.purchases (email);

alter table public.purchases enable row level security;

-- Written only by the webhook route under the service-role client -- no
-- authenticated-user insert path exists (unlike book_unlocks, a buyer
-- never inserts their own purchase row). Read-only for admins, same
-- is_admin subquery pattern as 0043_self_harm_flags.sql's "admins read
-- all flags" policy.
create policy "admins read all purchases" on public.purchases
  for select using (
    exists (select 1 from public.users where id = auth.uid() and is_admin = true)
  );

-- select granted to `authenticated` so the is_admin-scoped policy above
-- has a base grant to apply to -- same reasoning as 0043_self_harm_flags.sql.
-- No insert/update/delete grant for authenticated: this table is never
-- written under a user's own session.
grant select on public.purchases to authenticated;
grant all on public.purchases to service_role;
