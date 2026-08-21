-- Distinguishes which Systeme.io funnel/offer a purchase came from (main
-- book funnel vs. gift funnel). Extracted from the webhook payload's
-- orderItem.resources[0].tag.name (e.g. "llfab-book-buyer" vs
-- "llfab-gift-buyer"), falling back to funnelStep.funnel.name when no tag
-- is present. See app/api/webhooks/systeme/route.ts.
alter table public.purchases add column product_tag text;
