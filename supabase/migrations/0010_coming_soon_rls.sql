-- Extend reader visibility to include coming_soon collections and books so
-- they appear as teaser cards in the Library. Only 'draft' stays admin-only.

drop policy "published collections are readable" on public.collections;
drop policy "published books are readable" on public.books;

create policy "non-draft collections are readable" on public.collections
  for select using (
    status in ('published', 'coming_soon')
    or exists (select 1 from public.users where id = auth.uid() and is_admin)
  );

create policy "non-draft books are readable" on public.books
  for select using (
    status in ('published', 'coming_soon')
    or exists (select 1 from public.users where id = auth.uid() and is_admin)
  );

-- Chapters and badges stay published-only: we don't want to leak chapter
-- content for books that aren't open yet. The teaser card only needs the
-- book row (title, subtitle, description, status).
