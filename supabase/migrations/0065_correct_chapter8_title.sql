-- Chapter 8's title ("No Doesn't Always Mean No") read as ambiguous about
-- consent -- corrected to "Learning to Say No", which keeps the chapter's
-- actual lesson (boundaries, saying no without guilt) without the
-- ambiguous phrasing. Title-cased to match every other chapter title in
-- this table (see 0003_seed_baby_book.sql). Only the title changes --
-- reflect_question, challenge_text, and the Boundaries Badge description
-- (already corrected in 0008_correct_chapter_text.sql) are untouched.
UPDATE public.chapters
SET title = 'Learning to Say No'
WHERE book_id = (SELECT id FROM public.books WHERE slug = 'baby')
  AND number = 8;
