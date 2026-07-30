-- Missed in 0033: every other table in this schema explicitly grants
-- service_role alongside authenticated (see 0004_grants.sql), even though
-- service_role bypasses RLS and none of the application's own code paths
-- actually need this view (service-role call sites read public.users
-- directly). Grant added for consistency with that established pattern
-- and so ad hoc service-role scripts/debugging can query it too.
grant select on public.public_profiles to service_role;
