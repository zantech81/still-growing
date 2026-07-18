-- Content moderation for the Circle: distinguish *why* a reflection is
-- hidden (spam filter vs. user reports) from the pre-existing "kept private
-- by the author" case, and let signed-in readers report a reflection.

alter table public.reflections
  add column flag_reason text
  check (flag_reason is null or flag_reason in ('spam', 'reported'));

create table public.content_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.users(id) on delete cascade,
  reflection_id uuid not null references public.reflections(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (reporter_id, reflection_id)
);

alter table public.content_reports enable row level security;

create policy "users report reflections" on public.content_reports
  for insert with check (auth.uid() = reporter_id);
create policy "users read own reports" on public.content_reports
  for select using (auth.uid() = reporter_id);
create policy "admins read all reports" on public.content_reports
  for select using (
    exists (select 1 from public.users where id = auth.uid() and is_admin = true)
  );

grant select, insert on public.content_reports to authenticated;
grant select, insert, update, delete on public.content_reports to service_role;

-- Auto-hide once a reflection collects 3 unique reporters. SECURITY DEFINER
-- is required because the reporter is never the reflection's owner, and the
-- existing "users edit own reflections" RLS policy only allows
-- auth.uid() = user_id (see migration 0017 for the same pattern).
create or replace function public.check_reflection_reports()
  returns trigger
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  report_count int;
begin
  select count(distinct reporter_id) into report_count
  from public.content_reports
  where reflection_id = new.reflection_id;

  if report_count >= 3 then
    update public.reflections
    set is_hidden = true, flag_reason = 'reported'
    where id = new.reflection_id;
  end if;

  return new;
end;
$$;

create trigger content_reports_auto_hide
  after insert on public.content_reports
  for each row execute function public.check_reflection_reports();
