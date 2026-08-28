-- The Grove: admin-authored content beyond the core 12-chapter journey
-- (videos, quotes, announcements) -- 2026-08-15 punch-list item. One
-- post type, not three: title + rich body + an optional single media
-- attachment. What the body/media actually contain (a quote has no
-- media, an announcement has no media, a video update has a YouTube
-- link) is what makes a post read as one kind of thing or another, not
-- a stored "type" column.
create table public.grove_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  media_url text,
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_at timestamptz not null default now(),
  published_at timestamptz,
  created_by uuid references public.users(id) on delete set null
);

alter table public.grove_posts enable row level security;

-- Same "published rows are readable by anyone, admins see everything"
-- shape as 0010_coming_soon_rls.sql's books/collections policies.
create policy "published grove posts are publicly readable" on public.grove_posts
  for select using (
    status = 'published'
    or exists (select 1 from public.users where id = auth.uid() and is_admin)
  );

-- Any admin, not just super_admin -- Grove authoring isn't one of the
-- two capabilities this punch-list item scoped to the super-admin tier.
create policy "admins manage grove posts" on public.grove_posts
  for all using (
    exists (select 1 from public.users where id = auth.uid() and is_admin)
  );

grant select on public.grove_posts to anon, authenticated;
grant insert, update, delete on public.grove_posts to authenticated;
grant all on public.grove_posts to service_role;
