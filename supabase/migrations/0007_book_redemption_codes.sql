-- Per-book access control via redemption codes.
-- Each book has one shared code (set by admin); readers enter it once to unlock.
-- book_unlocks is the gate — Journey/chapter pages redirect to /library if absent.

-- One shared code per book, nullable so a book can be created before its code is set
ALTER TABLE public.books ADD COLUMN redemption_code text UNIQUE;

-- Records that a reader has entered the correct code for a book
CREATE TABLE public.book_unlocks (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES public.users(id)  ON DELETE CASCADE,
  book_id     uuid        NOT NULL REFERENCES public.books(id)  ON DELETE CASCADE,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, book_id)
);

ALTER TABLE public.book_unlocks ENABLE ROW LEVEL SECURITY;

-- Readers can only see and create their own unlock records
CREATE POLICY "users see own book unlocks" ON public.book_unlocks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "users create own book unlocks" ON public.book_unlocks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Grants: authenticated readers need SELECT + INSERT; service_role needs all for admin
GRANT SELECT, INSERT ON public.book_unlocks TO authenticated;
GRANT ALL ON public.book_unlocks TO service_role;

-- Set the Baby Wisdom book's access code
UPDATE public.books SET redemption_code = 'GROWBABY' WHERE slug = 'baby';
