-- Scheduled Grove posts: reuses status='draft' rather than a third status
-- value. A scheduled post IS a draft (not yet public, admin-editable,
-- excluded by the existing "status = 'published' OR admin" RLS read
-- policy) with one extra fact attached -- a future date it should stop
-- being a draft. Every existing status='published' check across the
-- codebase (RLS, app/grove/page.tsx's query, AppShell's latestGrovePostAt
-- lookup) stays correct unchanged; only the daily cron
-- (app/api/cron/scheduled-content) and the admin list/form need to know
-- about this new column at all.
alter table public.grove_posts add column scheduled_for date;
