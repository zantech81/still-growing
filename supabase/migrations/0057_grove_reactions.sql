-- Grove "Felt this" reactions -- purely statistical (Zan: "no need to
-- notify admin or email, its purely statistical"), unlike reflection
-- reactions (0001_init.sql's reactions table + lib/notifications.ts's
-- notifyReaction, wired into app/api/reactions/route.ts). A separate
-- table rather than an extension of `reactions`: Grove reactions have no
-- notification/email path to build at all, so they don't belong in the
-- same table as one that always creates both.
create table public.grove_reactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  grove_post_id uuid not null references public.grove_posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, grove_post_id)
);

alter table public.grove_posts add column hearts_count integer not null default 0;

alter table public.grove_reactions enable row level security;

-- Same "publicly readable, write only your own row" shape as
-- 0002_rls.sql's reactions policies.
create policy "grove reactions are publicly readable" on public.grove_reactions
  for select using (true);
create policy "users create own grove reactions" on public.grove_reactions
  for insert with check (auth.uid() = user_id);
create policy "users remove own grove reactions" on public.grove_reactions
  for delete using (auth.uid() = user_id);

grant select on public.grove_reactions to anon, authenticated;
grant insert, delete on public.grove_reactions to authenticated;
grant all on public.grove_reactions to service_role;

-- security definer + a pinned search_path from the very first version of
-- these functions -- 0017_trigger_security_definer.sql had to retrofit
-- this onto reflections' hearts_count trigger after shipping without it:
-- a non-owner's reaction hit the reflections UPDATE policy's own-row
-- check and silently updated 0 rows. The equivalent here would be worse,
-- not just occasionally broken: grove_posts' own update policy
-- ("admins manage grove posts") only allows admins, and posts are
-- admin-authored, so literally every reader's reaction would silently
-- no-op without this.
create function public.increment_grove_hearts_count()
  returns trigger
  language plpgsql
  security definer
  set search_path = public
as $$
begin
  update public.grove_posts set hearts_count = hearts_count + 1 where id = new.grove_post_id;
  return new;
end;
$$;

create trigger on_grove_reaction_created
  after insert on public.grove_reactions
  for each row execute procedure public.increment_grove_hearts_count();

create function public.decrement_grove_hearts_count()
  returns trigger
  language plpgsql
  security definer
  set search_path = public
as $$
begin
  update public.grove_posts set hearts_count = greatest(hearts_count - 1, 0) where id = old.grove_post_id;
  return old;
end;
$$;

create trigger on_grove_reaction_deleted
  after delete on public.grove_reactions
  for each row execute procedure public.decrement_grove_hearts_count();
