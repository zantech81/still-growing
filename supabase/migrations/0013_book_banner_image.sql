-- Full-size portrait cover image for the Journey page.
-- Separate from cover_image_url (thumbnail used on library cards).
-- Recommended upload: ~625×1000 (5:8 portrait, matching ebook proportions).
alter table public.books add column banner_image_url text;
