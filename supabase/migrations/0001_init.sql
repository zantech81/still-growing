-- Still Growing — Initial schema
-- Reflects Still_Growing_Data_Schema.md, adjusted for the honor-system decision:
-- no purchase_tag verification, no RedemptionCode. systeme_contact_id is a
-- write-only marketing sync target, not a gate.

create extension if not exists "uuid-ossp";

-- ── User profile ─────────────────────────────────────────────────────────
-- Supabase Auth owns auth.users (email, OAuth identity, password).
-- This table is the public profile, linked 1:1 by id = auth.uid().
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  display_name text not null,
  intro text,
  avatar_color text default '#E8A0B8',
  systeme_contact_id text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  last_active_at timestamptz not null default now()
);

-- Auto-create a profile row the moment someone signs up (OAuth or email).
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, display_name, avatar_color)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    ('#' || substr(md5(random()::text), 1, 6))
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── Content hierarchy: Collection → Book → Chapter → Badge ─────────────
create type content_status as enum ('draft', 'coming_soon', 'published');

create table public.collections (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  sort_order integer not null default 0,
  status content_status not null default 'draft',
  created_at timestamptz not null default now()
);

create table public.books (
  id uuid primary key default uuid_generate_v4(),
  collection_id uuid not null references public.collections(id) on delete cascade,
  slug text unique not null,              -- e.g. 'baby' → stillgrowing.co/baby/ch1
  title text not null,
  subtitle text,
  description text,
  cover_image_url text,
  gamification_config jsonb not null default '{
    "mechanic": "badges",
    "badge_trigger": "claim_after_read",
    "reward_type": "video",
    "chapter_unlock": "sequential",
    "reflection": { "enabled": true, "required": false, "max_length": 280 }
  }',
  sort_order integer not null default 0,
  status content_status not null default 'draft',
  created_at timestamptz not null default now(),
  published_at timestamptz
);

create table public.chapters (
  id uuid primary key default uuid_generate_v4(),
  book_id uuid not null references public.books(id) on delete cascade,
  number integer not null,
  title text not null,
  milestone_label text,
  reflect_question text not null,
  challenge_text text not null,
  mux_playback_id text,                    -- nullable: book can launch before all videos are ready
  created_at timestamptz not null default now(),
  unique (book_id, number)
);

create table public.badges (
  id uuid primary key default uuid_generate_v4(),
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  name text not null,
  icon text,
  description text
);

-- ── Progress & engagement ────────────────────────────────────────────────
create table public.user_books (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  started_at timestamptz not null default now(),
  current_chapter integer not null default 1,
  badges_earned integer not null default 0,
  completed_at timestamptz,
  unique (user_id, book_id)
);

create table public.user_badges (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  badge_id uuid not null references public.badges(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  earned_at timestamptz not null default now(),
  unique (user_id, badge_id)
);

create table public.reflections (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  chapter_number integer not null,          -- denormalized for spoiler-safe filtering
  text text not null,
  is_hidden boolean not null default false,
  created_at timestamptz not null default now(),
  hearts_count integer not null default 0
);

create table public.reactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  reflection_id uuid not null references public.reflections(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, reflection_id)
);

create type notification_type as enum ('reaction', 'new_reflection', 'new_book', 'milestone');

create table public.notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  type notification_type not null,
  payload jsonb not null default '{}',
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  email_sent boolean not null default false
);

-- ── Denormalized counter triggers ───────────────────────────────────────
create function public.increment_hearts_count() returns trigger as $$
begin
  update public.reflections set hearts_count = hearts_count + 1 where id = new.reflection_id;
  return new;
end;
$$ language plpgsql;

create trigger on_reaction_created
  after insert on public.reactions
  for each row execute procedure public.increment_hearts_count();

create function public.decrement_hearts_count() returns trigger as $$
begin
  update public.reflections set hearts_count = greatest(hearts_count - 1, 0) where id = old.reflection_id;
  return old;
end;
$$ language plpgsql;

create trigger on_reaction_deleted
  after delete on public.reactions
  for each row execute procedure public.decrement_hearts_count();
