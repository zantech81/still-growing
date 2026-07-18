-- Customizable teaser copy for the reveal_details=false "mystery" mode
-- introduced in 0019. Nullable: the app falls back to the first preset
-- (see lib/comingSoonPlaceholders.ts) when unset.
alter table public.books
  add column placeholder_text text;
