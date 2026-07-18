-- Author consent for OTHER readers to share a reflection externally
-- (distinct from is_hidden, which only controls in-app Circle visibility).
-- Set at submission time; only meaningful when the reflection is also
-- shared to the Circle (is_hidden = false). Enforced server-side in both
-- app/api/reflections/route.ts (on create) and app/api/shares/route.ts
-- (on share creation), not just hidden in the UI.
alter table public.reflections
  add column allow_external_share boolean not null default false;
