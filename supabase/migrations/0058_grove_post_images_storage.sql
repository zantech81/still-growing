-- Public bucket for inline images in Grove post bodies, uploaded from the
-- new rich-text editor (components/admin/grove-editor/GroveEditor.tsx).
-- Exact same shape as 0011_book_covers_storage.sql's book-covers bucket --
-- public so image URLs work without auth tokens, admin-only write.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'grove-post-images',
  'grove-post-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

create policy "admins can upload grove post images" on storage.objects
  for insert with check (
    bucket_id = 'grove-post-images'
    and exists (select 1 from public.users where id = auth.uid() and is_admin)
  );

create policy "admins can replace grove post images" on storage.objects
  for update using (
    bucket_id = 'grove-post-images'
    and exists (select 1 from public.users where id = auth.uid() and is_admin)
  );

create policy "admins can delete grove post images" on storage.objects
  for delete using (
    bucket_id = 'grove-post-images'
    and exists (select 1 from public.users where id = auth.uid() and is_admin)
  );

create policy "grove post images are publicly readable" on storage.objects
  for select using (bucket_id = 'grove-post-images');
