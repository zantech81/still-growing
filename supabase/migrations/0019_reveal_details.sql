-- Lets admins tease a coming_soon book without revealing its title/details.
-- Only meaningful while status = 'coming_soon'; ignored for draft/published.
alter table public.books
  add column reveal_details boolean not null default true;
