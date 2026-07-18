-- Data capture only, no UI change yet: records which book's Circle
-- context a "Root for" action happened in (see app/api/connections/route.ts
-- and components/CircleFeed.tsx, which already has bookId in scope when
-- rendering the button). Nullable, since "root for" itself is a
-- person-to-person relationship independent of any book
-- (0029_connections.sql) -- this column is provenance, not a constraint
-- on the relationship. `on delete set null` rather than cascade: losing
-- track of which book a connection originated from should never delete
-- the connection itself.
alter table public.connections
  add column book_id uuid references public.books(id) on delete set null;
