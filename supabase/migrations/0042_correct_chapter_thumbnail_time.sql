-- Corrects the chapters.thumbnail_time values set in migration 0041. Those
-- were meant as MM:SS but were entered/interpreted as fractional seconds
-- (e.g. "0.26" instead of 26s), landing every chapter's poster inside the
-- shared ~2.5s brand-intro animation instead of on real per-chapter
-- footage. Values below are the same 12 chapters, corrected to whole
-- seconds.
update public.chapters set thumbnail_time = 26 where book_id = '3b165a9a-fbac-4d13-b54c-b1bf067367d6' and number = 1;
update public.chapters set thumbnail_time = 25 where book_id = '3b165a9a-fbac-4d13-b54c-b1bf067367d6' and number = 2;
update public.chapters set thumbnail_time = 7  where book_id = '3b165a9a-fbac-4d13-b54c-b1bf067367d6' and number = 3;
update public.chapters set thumbnail_time = 14 where book_id = '3b165a9a-fbac-4d13-b54c-b1bf067367d6' and number = 4;
update public.chapters set thumbnail_time = 5  where book_id = '3b165a9a-fbac-4d13-b54c-b1bf067367d6' and number = 5;
update public.chapters set thumbnail_time = 10 where book_id = '3b165a9a-fbac-4d13-b54c-b1bf067367d6' and number = 6;
update public.chapters set thumbnail_time = 15 where book_id = '3b165a9a-fbac-4d13-b54c-b1bf067367d6' and number = 7;
update public.chapters set thumbnail_time = 24 where book_id = '3b165a9a-fbac-4d13-b54c-b1bf067367d6' and number = 8;
update public.chapters set thumbnail_time = 14 where book_id = '3b165a9a-fbac-4d13-b54c-b1bf067367d6' and number = 9;
update public.chapters set thumbnail_time = 6  where book_id = '3b165a9a-fbac-4d13-b54c-b1bf067367d6' and number = 10;
update public.chapters set thumbnail_time = 3  where book_id = '3b165a9a-fbac-4d13-b54c-b1bf067367d6' and number = 11;
update public.chapters set thumbnail_time = 35 where book_id = '3b165a9a-fbac-4d13-b54c-b1bf067367d6' and number = 12;
