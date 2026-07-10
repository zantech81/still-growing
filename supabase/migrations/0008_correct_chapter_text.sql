-- Chapters 2, 3, 6, 8, and 11 previously contained placeholder text written
-- from memory. This migration replaces them with the exact reflect_question,
-- challenge_text, and badge description verified against
-- Life_Lessons_from_a_Baby_Ebook_v6.pdf. All 12 chapters are now verbatim.

-- ── Chapter 2 ────────────────────────────────────────────────────────────────
UPDATE public.chapters
SET
  reflect_question = $$When life feels overwhelming, do you pause to breathe, or do you push through on autopilot? What would it look like to give yourself permission to slow down before speeding up?$$,
  challenge_text   = $$Set three breathing anchors today. Before your first meeting, before lunch, and before bed. Take five slow breaths each time. Notice what shifts in your body and mind.$$
WHERE book_id = (SELECT id FROM public.books WHERE slug = 'baby')
  AND number = 2;

UPDATE public.badges
SET description = $$You learned to pause. To breathe before reacting. To find your center before moving forward. This badge honors the strength it takes to be still.$$
WHERE chapter_id = (
  SELECT id FROM public.chapters
  WHERE book_id = (SELECT id FROM public.books WHERE slug = 'baby') AND number = 2
);

-- ── Chapter 3 ────────────────────────────────────────────────────────────────
UPDATE public.chapters
SET
  reflect_question = $$Who believed in you before you believed in yourself? How did their faith shape the person you've become? And are you being that person for someone else right now?$$,
  challenge_text   = $$Write a short note to someone who believed in you. It doesn't have to be long or perfect. Just honest. Tell them what their belief meant. Send it today.$$
WHERE book_id = (SELECT id FROM public.books WHERE slug = 'baby')
  AND number = 3;

UPDATE public.badges
SET description = $$You remembered that you were never meant to do this alone. That accepting love isn't weakness. This badge honors the courage it takes to trust.$$
WHERE chapter_id = (
  SELECT id FROM public.chapters
  WHERE book_id = (SELECT id FROM public.books WHERE slug = 'baby') AND number = 3
);

-- ── Chapter 6 ────────────────────────────────────────────────────────────────
UPDATE public.chapters
SET
  reflect_question = $$What questions have you stopped asking? What curiosities have you abandoned because they seemed impractical? What would happen if you followed one of them today?$$,
  challenge_text   = $$Ask three genuine questions today. Not rhetorical ones. Real ones you don't know the answer to. Ask a colleague, a stranger, or yourself. Follow the curiosity wherever it leads.$$
WHERE book_id = (SELECT id FROM public.books WHERE slug = 'baby')
  AND number = 6;

UPDATE public.badges
SET description = $$You rekindled the spark of curiosity. You asked why, how, and what if. This badge celebrates the courage to wonder without needing immediate answers.$$
WHERE chapter_id = (
  SELECT id FROM public.chapters
  WHERE book_id = (SELECT id FROM public.books WHERE slug = 'baby') AND number = 6
);

-- ── Chapter 8 ────────────────────────────────────────────────────────────────
UPDATE public.chapters
SET
  reflect_question = $$Where in your life are you saying yes when you mean no? What boundary have you been afraid to set because you worry about being seen as difficult or unkind?$$,
  challenge_text   = $$Say "no" to one thing today that you would normally agree to out of guilt or obligation. Notice how it feels. Notice that the world doesn't end. Practice protecting your energy.$$
WHERE book_id = (SELECT id FROM public.books WHERE slug = 'baby')
  AND number = 8;

UPDATE public.badges
SET description = $$You learned that no is not cruelty. It is clarity. That protecting your energy is not selfish but necessary. This badge honors your right to choose.$$
WHERE chapter_id = (
  SELECT id FROM public.chapters
  WHERE book_id = (SELECT id FROM public.books WHERE slug = 'baby') AND number = 8
);

-- ── Chapter 11 ───────────────────────────────────────────────────────────────
UPDATE public.chapters
SET
  reflect_question = $$Who are the five people you spend the most time with? Do they make you feel safe to grow, fail, and try again? Or do they make you feel like you need to perform?$$,
  challenge_text   = $$Reach out to one person who makes you feel seen. Not to ask for anything. Just to say: 'I'm glad you're in my room.' Notice how it feels to acknowledge your people.$$
WHERE book_id = (SELECT id FROM public.books WHERE slug = 'baby')
  AND number = 11;

UPDATE public.badges
SET description = $$You chose your room wisely. You invested in people who invest in you. This badge honors the courage to build real connection.$$
WHERE chapter_id = (
  SELECT id FROM public.chapters
  WHERE book_id = (SELECT id FROM public.books WHERE slug = 'baby') AND number = 11
);
