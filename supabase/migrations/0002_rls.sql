-- Row-Level Security. Honor-system app, but every write is still scoped
-- to the authenticated user. Content tables are public-read once published.

alter table public.users enable row level security;
alter table public.collections enable row level security;
alter table public.books enable row level security;
alter table public.chapters enable row level security;
alter table public.badges enable row level security;
alter table public.user_books enable row level security;
alter table public.user_badges enable row level security;
alter table public.reflections enable row level security;
alter table public.reactions enable row level security;
alter table public.notifications enable row level security;

-- Users: can read any profile (display in Circle), can only edit their own.
create policy "profiles are publicly readable" on public.users
  for select using (true);
create policy "users can update own profile" on public.users
  for update using (auth.uid() = id);

-- Content: published rows are readable by anyone signed in; admins see all.
create policy "published collections are readable" on public.collections
  for select using (status = 'published' or exists (select 1 from public.users where id = auth.uid() and is_admin));
create policy "admins manage collections" on public.collections
  for all using (exists (select 1 from public.users where id = auth.uid() and is_admin));

create policy "published books are readable" on public.books
  for select using (status = 'published' or exists (select 1 from public.users where id = auth.uid() and is_admin));
create policy "admins manage books" on public.books
  for all using (exists (select 1 from public.users where id = auth.uid() and is_admin));

create policy "chapters of published books are readable" on public.chapters
  for select using (
    exists (select 1 from public.books b where b.id = book_id and b.status = 'published')
    or exists (select 1 from public.users where id = auth.uid() and is_admin)
  );
create policy "admins manage chapters" on public.chapters
  for all using (exists (select 1 from public.users where id = auth.uid() and is_admin));

create policy "badges of published books are readable" on public.badges
  for select using (
    exists (
      select 1 from public.chapters c join public.books b on b.id = c.book_id
      where c.id = chapter_id and b.status = 'published'
    ) or exists (select 1 from public.users where id = auth.uid() and is_admin)
  );
create policy "admins manage badges" on public.badges
  for all using (exists (select 1 from public.users where id = auth.uid() and is_admin));

-- Progress: strictly own-row only.
create policy "users manage own book progress" on public.user_books
  for all using (auth.uid() = user_id);
create policy "users manage own badges" on public.user_badges
  for all using (auth.uid() = user_id);
create policy "users can insert own badges" on public.user_badges
  for insert with check (auth.uid() = user_id);

-- Reflections: spoiler-safe read handled in application query (chapter_number
-- <= reader's current_chapter); RLS just enforces visibility + hidden flag +
-- ownership for writes.
create policy "reflections are readable if not hidden" on public.reflections
  for select using (is_hidden = false or auth.uid() = user_id);
create policy "users create own reflections" on public.reflections
  for insert with check (auth.uid() = user_id);
create policy "users edit own reflections" on public.reflections
  for update using (auth.uid() = user_id);

-- Reactions: readable by all, writable only as yourself.
create policy "reactions are publicly readable" on public.reactions
  for select using (true);
create policy "users create own reactions" on public.reactions
  for insert with check (auth.uid() = user_id);
create policy "users remove own reactions" on public.reactions
  for delete using (auth.uid() = user_id);

-- Notifications: strictly own-row only.
create policy "users read own notifications" on public.notifications
  for select using (auth.uid() = user_id);
create policy "users update own notifications" on public.notifications
  for update using (auth.uid() = user_id);
