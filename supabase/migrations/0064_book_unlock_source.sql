-- Records which of a book's two access codes (0063_book_redemption_code_amazon.sql)
-- a reader actually redeemed, so UnlockVerificationSummary.tsx can split its
-- "unverified" bucket into the expected Amazon-code subset and the genuinely
-- unexplained rest, rather than lumping both together.
--
-- text with a CHECK, not a boolean: reads directly in an admin querying the
-- table by hand ('code' / 'amazon_code' vs. true/false needing a column-name
-- lookup to interpret), and matches this project's existing convention for
-- small closed enums (books.status, e.g.) over one-off booleans.
--
-- NOT NULL DEFAULT 'code': every unlock that exists before this migration was
-- necessarily redeemed against the only code that existed at the time
-- (0007_book_redemption_codes.sql's single redemption_code), so backfilling
-- 'code' for existing rows is exact, not a guess.
ALTER TABLE public.book_unlocks
  ADD COLUMN unlock_source text NOT NULL DEFAULT 'code'
    CHECK (unlock_source IN ('code', 'amazon_code'));
