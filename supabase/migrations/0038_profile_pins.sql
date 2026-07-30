-- Pin up to 3 shared reflections to a profile. Separate from, and
-- additive to, the existing "share to Circle" visibility toggle (a
-- reflection can be shared but not pinned; it can never be pinned but
-- not shared).

create table public.profile_pins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  reflection_id uuid not null references public.reflections(id) on delete cascade,
  display_order integer not null default 0,
  pinned_at timestamptz not null default now(),
  unique (user_id, reflection_id)
);

create index profile_pins_user_id_idx on public.profile_pins (user_id);

alter table public.profile_pins enable row level security;

-- Public read, same as connections/reactions: pins are meant to be
-- visible to anyone looking at the profile.
create policy "profile_pins are publicly readable" on public.profile_pins
  for select using (true);

-- Only a reflection the caller owns AND that is currently shared
-- (is_hidden = false) can be pinned -- checked here at insert time, on
-- top of (not instead of) the ongoing enforcement below that un-pins it
-- the moment it stops being true.
create policy "users pin own shared reflections" on public.profile_pins
  for insert with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.reflections r
      where r.id = reflection_id and r.user_id = auth.uid() and r.is_hidden = false
    )
  );

create policy "users reorder own pins" on public.profile_pins
  for update using (auth.uid() = user_id);

create policy "users unpin own" on public.profile_pins
  for delete using (auth.uid() = user_id);

grant select, insert, update, delete on public.profile_pins to authenticated;
grant select, insert, update, delete on public.profile_pins to service_role;

-- Max 3 per user, enforced at the DB level, not just client-side (the
-- reader can add/remove pins freely; nothing stops a race between two
-- requests otherwise). No SECURITY DEFINER needed here: unlike the
-- users-table admin check, this policy isn't self-referential in a way
-- that recurses -- profile_pins' own SELECT policy is a plain `using
-- (true)`, so this trigger's internal count query resolves normally.
create or replace function public.enforce_max_pins()
returns trigger
language plpgsql
as $$
begin
  if (select count(*) from public.profile_pins where user_id = new.user_id) >= 3 then
    raise exception 'You can only pin up to 3 reflections.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger profile_pins_max_three
  before insert on public.profile_pins
  for each row execute function public.enforce_max_pins();

-- CRITICAL: a profile can never display something that's since become
-- private, deleted, or moderation-hidden. There are at least 5
-- independent paths that can take a reflection out of "safely
-- shareable" state (author toggles private, author deletes, admin
-- hides via ModerationList.tsx, the spam heuristic re-hiding on edit,
-- and this schema's own content_reports_auto_hide trigger from
-- 0018_content_moderation.sql) -- three of those are application code
-- paths that don't share a common function, and the fourth is itself
-- a trigger. A single application-code hook can't cover all of them
-- reliably; a trigger on reflections does, because it fires regardless
-- of what statement caused the row to change, including this schema's
-- own other trigger (an UPDATE from inside check_reflection_reports
-- fires this same trigger, same as any other UPDATE would).
--
-- SECURITY DEFINER is required: an admin hiding someone else's
-- reflection is not the pin's owner, so without bypassing RLS here, the
-- DELETE below would run under the admin's own permissions and silently
-- affect zero rows ("users unpin own" only permits auth.uid() = user_id).
create or replace function public.unpin_on_hide()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'DELETE' then
    delete from public.profile_pins where reflection_id = old.id;
    return old;
  end if;

  if new.is_hidden = true and old.is_hidden = false then
    delete from public.profile_pins where reflection_id = new.id;
  end if;
  return new;
end;
$$;

create trigger reflections_unpin_on_hide
  after update of is_hidden or delete on public.reflections
  for each row execute function public.unpin_on_hide();
