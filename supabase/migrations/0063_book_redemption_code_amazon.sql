-- Second, separately admin-editable access code per book, for Amazon KDP
-- buyers -- see 0007_book_redemption_codes.sql for the original one-code
-- design. Amazon sales never fire the Systeme.io webhook (0045_purchases.sql),
-- so a KDP buyer's email can never land in `purchases` and every legitimate
-- KDP unlock shows up as "unverified" in UnlockVerificationSummary.tsx,
-- indistinguishable from a genuinely suspicious one. This column lets that
-- expected gap be labeled instead of just absorbed into the noise.

-- Nullable, same as redemption_code, so a book can exist without an Amazon
-- code (the common case until/unless it actually ships on KDP).
--
-- UNIQUE, matching redemption_code's own constraint: this isn't load-bearing
-- for app/api/redeem/route.ts (a submitted code is only ever compared against
-- the single already-identified book, never looked up across the table), but
-- it's the same free safety net redemption_code already gets against an
-- admin accidentally reusing one book's code text on another book, which
-- would otherwise read as a copy-paste mistake in the admin UI with no
-- warning.
ALTER TABLE public.books ADD COLUMN redemption_code_amazon text UNIQUE;

-- A book's two codes are deliberately kept distinct from each other: if they
-- were ever equal, the two strings compared in app/api/redeem/route.ts would
-- be indistinguishable, so the resulting book_unlocks row could never
-- correctly attribute which one a reader actually typed -- silently
-- defeating the reason this column exists. Scoped to one row only (not
-- cross-book, and not cross-column against other books' codes): with a
-- single published book today and redemption always looked up by book id
-- rather than by scanning codes globally, a code value repeating across two
-- different books/columns has no functional effect on redemption, so a
-- database-wide exclusion constraint would add real complexity (a shared
-- codes table, or a cross-column exclusion constraint) for a risk that
-- doesn't exist yet. Revisit if/when codes are ever looked up without an
-- id in hand.
ALTER TABLE public.books ADD CONSTRAINT books_redemption_codes_distinct
  CHECK (redemption_code_amazon IS NULL OR redemption_code_amazon <> redemption_code);
