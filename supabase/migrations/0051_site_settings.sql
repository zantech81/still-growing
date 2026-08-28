-- Site-wide maintenance mode: a singleton settings row, checked by
-- middleware.ts on (almost) every request. id is pinned to 1 by the check
-- constraint below, and the primary key blocks a second row with that same
-- id, so this table can never hold more than the one row seeded here.
create table public.site_settings (
  id int primary key default 1,
  maintenance_mode boolean not null default false,
  maintenance_message text not null default
    'We''re making some improvements and will be back shortly. Thanks for your patience!',
  updated_at timestamptz not null default now(),
  updated_by uuid references public.users(id) on delete set null,
  constraint site_settings_singleton check (id = 1)
);

insert into public.site_settings (id) values (1);

alter table public.site_settings enable row level security;

-- Publicly readable, on purpose: middleware.ts's maintenance check runs
-- for anonymous visitors too (that's the whole point -- gate everyone,
-- signed in or not), and there's nothing sensitive in a boolean flag plus
-- a message meant to be shown to every reader anyway.
create policy "site settings are publicly readable" on public.site_settings
  for select using (true);

create policy "admins update site settings" on public.site_settings
  for update using (
    exists (select 1 from public.users where id = auth.uid() and is_admin = true)
  );

-- No insert/delete policy or grant: the one row is seeded above and only
-- ever updated, matching the singleton design -- nothing should ever add
-- or remove a row here.
grant select on public.site_settings to anon, authenticated;
grant update on public.site_settings to authenticated;
grant all on public.site_settings to service_role;
