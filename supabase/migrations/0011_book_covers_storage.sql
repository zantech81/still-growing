-- Public bucket for book cover images.
-- The bucket is public so cover URLs work without auth tokens.
-- Upload/replace/delete is restricted to admins; reads are open to all.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'book-covers',
  'book-covers',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

create policy "admins can upload book covers" on storage.objects
  for insert with check (
    bucket_id = 'book-covers'
    and exists (select 1 from public.users where id = auth.uid() and is_admin)
  );

create policy "admins can replace book covers" on storage.objects
  for update using (
    bucket_id = 'book-covers'
    and exists (select 1 from public.users where id = auth.uid() and is_admin)
  );

create policy "admins can delete book covers" on storage.objects
  for delete using (
    bucket_id = 'book-covers'
    and exists (select 1 from public.users where id = auth.uid() and is_admin)
  );

create policy "book covers are publicly readable" on storage.objects
  for select using (bucket_id = 'book-covers');
