-- Grant necessary table privileges to Supabase roles.
-- PostgreSQL 15 changed public schema defaults: new tables no longer inherit
-- broad grants automatically, so we grant explicitly here.

grant usage on schema public to anon, authenticated, service_role;

grant select on public.collections to anon, authenticated, service_role;
grant select on public.books       to anon, authenticated, service_role;
grant select on public.chapters    to anon, authenticated, service_role;
grant select on public.badges      to anon, authenticated, service_role;

grant select, insert, update, delete on public.users          to authenticated, service_role;
grant select, insert, update, delete on public.user_books     to authenticated, service_role;
grant select, insert, update, delete on public.user_badges    to authenticated, service_role;
grant select, insert, update, delete on public.reflections    to authenticated, service_role;
grant select, insert, update, delete on public.reactions      to authenticated, service_role;
grant select, insert, update, delete on public.notifications  to authenticated, service_role;

grant all on public.collections to service_role;
grant all on public.books       to service_role;
grant all on public.chapters    to service_role;
grant all on public.badges      to service_role;

-- Sequences (needed for gen_random_uuid() to work via service_role inserts)
grant usage, select on all sequences in schema public to authenticated, service_role;
