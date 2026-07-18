-- Per-chapter unlock codes, required alongside the reflection to claim a
-- badge. Same nullable-until-set pattern as books.redemption_code (see
-- 0007_book_redemption_codes.sql), but scoped uniqueness: two different
-- books are allowed to reuse the same code word, only chapters within the
-- same book must be distinct.

ALTER TABLE public.chapters ADD COLUMN unlock_code text;

ALTER TABLE public.chapters ADD CONSTRAINT chapters_book_id_unlock_code_key UNIQUE (book_id, unlock_code);
