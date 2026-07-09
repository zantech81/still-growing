-- Opt-in country field for the Circle flag display.
-- Never required, never collected at signup. Nullable always.
-- CHECK enforces ISO 3166-1 alpha-2 format (2 uppercase letters).
alter table public.users
  add column country_code text
  check (country_code is null or (length(country_code) = 2 and country_code = upper(country_code)));
