-- Seed: "Life Lessons from a Baby" — content pulled verbatim from
-- Life_Lessons_from_a_Baby_Ebook_v5.pdf (the confirmed source of truth).

insert into public.collections (name, description, sort_order, status)
values ('Baby Wisdom', 'What the smallest humans teach us about living, loving, and growing up.', 1, 'published');

insert into public.books (collection_id, slug, title, subtitle, description, sort_order, status, published_at)
select id, 'baby', 'Life Lessons from a Baby',
  'What the smallest humans teach us about living, loving, and growing up… at any age',
  '12 chapters, 12 badges, 12 challenges.', 1, 'published', now()
from public.collections where name = 'Baby Wisdom';

-- Chapters + badges, in order. reflect_question / challenge_text / badge
-- description are verbatim from the book.
do $$
declare
  b_id uuid;
  c_id uuid;
begin
  select id into b_id from public.books where slug = 'baby';

  -- Chapter 1
  insert into public.chapters (book_id, number, title, milestone_label, reflect_question, challenge_text)
  values (b_id, 1, 'You Were Born Ready', 'Milestone: First Breath',
    'When was the last time you gave yourself permission to begin something without needing to prove you were ready? What would change if you believed your presence alone was enough?',
    'This week, start one thing you have been putting off because you felt unready. Write it down. Then do the smallest possible version of it today. No preparation, no perfection. Just begin.')
  returning id into c_id;
  insert into public.badges (chapter_id, name, description) values (c_id, 'Arrival Badge',
    'You remembered that you didn''t need to earn your place. You showed up exactly as you were, and that was enough. This badge honors the truth that you were always ready.');

  -- Chapter 2
  insert into public.chapters (book_id, number, title, milestone_label, reflect_question, challenge_text)
  values (b_id, 2, 'Learn to Breathe First', 'Milestone: Self-Regulation',
    'Where in your life could you use one steady breath before reacting?',
    'Before responding to something stressful today, pause and take one deliberate breath first.')
  returning id into c_id;
  insert into public.badges (chapter_id, name, description) values (c_id, 'Stillness Badge',
    'You learned to pause. To breathe before reacting. To find your center before moving forward. This badge honors the strength it takes to be still.');

  -- Chapter 3
  insert into public.chapters (book_id, number, title, milestone_label, reflect_question, challenge_text)
  values (b_id, 3, 'Someone Believed in You', 'Milestone: Trust',
    'Who believed in you before you believed in yourself?',
    'Reach out to that person today, or become that person for someone else.')
  returning id into c_id;
  insert into public.badges (chapter_id, name, description) values (c_id, 'Trust Badge',
    'You recognized that no one grows entirely alone. This badge honors the people who held belief for you until you could hold it yourself.');

  -- Chapter 4
  insert into public.chapters (book_id, number, title, milestone_label, reflect_question, challenge_text)
  values (b_id, 4, 'Crawl Before You Sprint', 'Milestone: Patience',
    'Where in your life are you trying to sprint before you''ve learned to crawl? What would it look like to honor the small, unglamorous steps instead of skipping them?',
    'Pick one goal you''ve been rushing toward. Break it into the smallest possible next step. Do only that step today. Tomorrow, do the next one. Practice the crawl.')
  returning id into c_id;
  insert into public.badges (chapter_id, name, description) values (c_id, 'Crawler Badge',
    'You chose progress over perfection. You honored the small steps instead of demanding the leap. This badge celebrates the wisdom of moving at your own pace.');

  -- Chapter 5
  insert into public.chapters (book_id, number, title, milestone_label, reflect_question, challenge_text)
  values (b_id, 5, 'Falling Is Part of Walking', 'Milestone: Resilience',
    'When was the last time you let yourself fail without making it mean something about your worth? What would you attempt if falling wasn''t something to fear?',
    'Today, try something you might fail at. Something small. A new recipe, a conversation you''ve been avoiding, a creative project with no plan. Let the falling be the point.')
  returning id into c_id;
  insert into public.badges (chapter_id, name, description) values (c_id, 'Resilience Badge',
    'You stopped fearing the fall. You learned that every stumble is just the ground teaching you balance. This badge honors your courage to keep getting up.');

  -- Chapter 6
  insert into public.chapters (book_id, number, title, milestone_label, reflect_question, challenge_text)
  values (b_id, 6, 'Curiosity Is a Superpower', 'Milestone: Wonder',
    'What question have you stopped asking?',
    'Follow one moment of curiosity today, with no goal attached to where it leads.')
  returning id into c_id;
  insert into public.badges (chapter_id, name, description) values (c_id, 'Wonder Badge',
    'You let yourself wonder again, without needing it to be useful. This badge honors curiosity kept alive.');

  -- Chapter 7
  insert into public.chapters (book_id, number, title, milestone_label, reflect_question, challenge_text)
  values (b_id, 7, 'Before Words, There Was Intention', 'Milestone: Connection',
    'When was the last time you communicated what you truly needed without hiding behind politeness or deflection? What would it look like to reach out with the honesty of a child?',
    'Today, replace one text message with a phone call or face-to-face conversation. Notice how much more you communicate when words aren''t the only channel available.')
  returning id into c_id;
  insert into public.badges (chapter_id, name, description) values (c_id, 'Connection Badge',
    'You remembered that real communication goes beyond words. That reaching out with intention is braver than hiding behind language. This badge honors authentic connection.');

  -- Chapter 8
  insert into public.chapters (book_id, number, title, milestone_label, reflect_question, challenge_text)
  values (b_id, 8, 'No Doesn''t Always Mean No', 'Milestone: Boundaries',
    'Where do you say yes when you mean no?',
    'Say no to one small thing today, without over-explaining yourself.')
  returning id into c_id;
  insert into public.badges (chapter_id, name, description) values (c_id, 'Boundaries Badge',
    'You practiced meaning what you say. This badge honors the discipline of an honest no.');

  -- Chapter 9
  insert into public.chapters (book_id, number, title, milestone_label, reflect_question, challenge_text)
  values (b_id, 9, 'Play Is Serious Work', 'Milestone: Joy',
    'When was the last time you did something purely for the joy of it? Not for productivity, not for a goal, but just because it felt good? What would you play with if no one was watching?',
    'Schedule 30 minutes of unstructured play today. Draw, build, dance, explore. No phone, no goal, no audience. Just you and curiosity. See what emerges.')
  returning id into c_id;
  insert into public.badges (chapter_id, name, description) values (c_id, 'Joy Badge',
    'You remembered that play is not the opposite of work but the source of your best work. This badge celebrates the courage to be joyful without justification.');

  -- Chapter 10
  insert into public.chapters (book_id, number, title, milestone_label, reflect_question, challenge_text)
  values (b_id, 10, 'Stop Comparing', 'Milestone: Uniqueness',
    'Whose timeline are you measuring yourself against? What would change if you stopped looking sideways and only looked at how far you''ve come from where you started?',
    'Unfollow one account that makes you feel behind. Replace that scroll time with writing three things you''ve accomplished this year that you''re genuinely proud of.')
  returning id into c_id;
  insert into public.badges (chapter_id, name, description) values (c_id, 'Own Lane Badge',
    'You stopped measuring your chapter three against someone else''s chapter twenty. This badge honors the freedom that comes from running your own race.');

  -- Chapter 11
  insert into public.chapters (book_id, number, title, milestone_label, reflect_question, challenge_text)
  values (b_id, 11, 'The People in the Room', 'Milestone: Community',
    'Who is in your circle, and are they the right people for who you''re becoming?',
    'Reach out to one person who adds real value to your life and tell them so.')
  returning id into c_id;
  insert into public.badges (chapter_id, name, description) values (c_id, 'Community Badge',
    'You recognized that growth is rarely solitary. This badge honors the people who walk alongside you.');

  -- Chapter 12
  insert into public.chapters (book_id, number, title, milestone_label, reflect_question, challenge_text)
  values (b_id, 12, 'You''re Still Growing', 'Milestone: Lifelong Growth',
    'What would you attempt if you truly believed growth has no expiration date?',
    'Write down one thing you want to still be learning ten years from now.')
  returning id into c_id;
  insert into public.badges (chapter_id, name, description) values (c_id, 'Growth Badge',
    'You proved that growth doesn''t stop when the book ends. This badge honors everything still ahead.');
end $$;
