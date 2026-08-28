-- Ties each review to the book it's about, ahead of a second book
-- shipping -- reviews had zero book association until now (see
-- 0044_reviews.sql), which was fine with exactly one published book but
-- would become ambiguous the moment a second one exists.
--
-- Nullable, not NOT NULL, deliberately: this column uses "on delete set
-- null" so a review survives its book being deleted rather than
-- cascading away (a review is user-authored content worth keeping even
-- if the book it references is later removed). A NOT NULL constraint
-- here would make that ON DELETE action fail outright -- Postgres can't
-- null out a NOT NULL column, so deleting a referenced book would error
-- instead of completing. "Always set on a new review" is enforced at
-- the app level instead: app/api/reviews/route.ts rejects any POST
-- without a valid, published book_id.
alter table public.reviews
  add column book_id uuid references public.books(id) on delete set null;

-- Backfill: exactly one published book exists today (slug 'baby'), so
-- every existing review is unambiguously about it. Looked up by slug
-- rather than a hardcoded id so this migration stays correct if ids
-- differ across environments.
update public.reviews
set book_id = (select id from public.books where slug = 'baby')
where book_id is null;
