-- Unverified-unlock cluster alert: the leading signal for a leaked
-- shared redemption code (0007_book_redemption_codes.sql's GROWBABY-
-- style one-code-per-book design has no per-buyer distinction, so a
-- leaked/pirated redemption looks identical to a legitimate one at the
-- row level -- the only thing that stands out is an abnormal burst of
-- *new* unverified unlocks in a short window; see
-- components/admin/UnlockVerificationSummary.tsx's existing verified/
-- unverified split via lib/purchases.ts, and app/api/cron/unlock-alert's
-- own comments for why "unverified" alone is deliberately not treated
-- as a piracy signal on its own. This is detection only, never
-- enforcement -- nothing here touches app/api/redeem/route.ts.

-- Shared, admin-editable threshold: one number, not per-book, so
-- there's a single obvious place to tune it -- same singleton table
-- maintenance_mode/announcement_active already live on (0051/0055).
-- Default of 10 is grounded in this project's real unlock data as of
-- 2026-09-01: "Life Lessons from a Baby" (the only published book) has
-- seen 8 unlocks total over 45 days, never more than 3 in any single
-- day (1 unverified) -- 10 is comfortably above the highest day this
-- book has ever had, while still catching a real burst long before it
-- reaches dozens or hundreds of redemptions.
alter table public.site_settings
  add column unlock_alert_threshold integer not null default 10;

-- Per-book edge-trigger state, not a single site_settings column: the
-- alert must be scoped per book (a second book is already planned
-- elsewhere in this project), and two different books can independently
-- be "currently over threshold" on different days -- a single shared
-- last-sent timestamp couldn't tell "book A already alerted, still
-- over" apart from "book B just crossed for the first time" -- so this
-- state lives on the row it actually describes.
--
-- unlock_alert_active is the real edge-trigger state: set true the
-- moment a book's trailing-24h unverified count first reaches the
-- threshold (the moment the alert email sends), left true while it
-- stays at/above threshold (no repeat email), and cleared back to false
-- automatically once a later check finds the count back under
-- threshold -- no email sent on clearing, only on the initial crossing.
-- last_unlock_alert_sent_at is purely informational, for an admin
-- glancing at the row to see when this last actually fired.
alter table public.books
  add column unlock_alert_active boolean not null default false,
  add column last_unlock_alert_sent_at timestamptz;
