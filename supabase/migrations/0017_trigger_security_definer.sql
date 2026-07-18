-- Root cause: increment_hearts_count and decrement_hearts_count were created
-- without SECURITY DEFINER, so they executed under the calling user's RLS
-- context. The reflections UPDATE policy (auth.uid() = user_id) blocks any
-- user from updating a row they don't own, meaning when User A reacted to
-- User B's reflection, the trigger UPDATE silently hit 0 rows and hearts_count
-- was never incremented. Only self-reactions ever worked.
--
-- Fix: SECURITY DEFINER makes the functions run as the function owner
-- (postgres superuser), bypassing RLS. SET search_path = public prevents
-- search_path injection. The trigger registrations are unchanged.

create or replace function public.increment_hearts_count()
  returns trigger
  language plpgsql
  security definer
  set search_path = public
as $$
begin
  update public.reflections
  set hearts_count = hearts_count + 1
  where id = new.reflection_id;
  return new;
end;
$$;

create or replace function public.decrement_hearts_count()
  returns trigger
  language plpgsql
  security definer
  set search_path = public
as $$
begin
  update public.reflections
  set hearts_count = greatest(hearts_count - 1, 0)
  where id = old.reflection_id;
  return old;
end;
$$;

-- Repair all existing hearts_count values by recounting from the reactions
-- table. Every row that was silently not-incremented is corrected here.
update public.reflections r
set hearts_count = (
  select count(*) from public.reactions where reflection_id = r.id
);
