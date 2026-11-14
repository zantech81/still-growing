-- Security fix: three holes found in the relaunch inventory.
--
-- 1. Access codes and chapter passwords were readable with the public anon
--    key (books.redemption_code, books.redemption_code_amazon,
--    chapters.unlock_code). Table-level SELECT is replaced with column-level
--    SELECT on every other column, so anon and authenticated can read the
--    same rows and columns as before except these three. A request that
--    names one of them, or uses select=*, is refused (42501). The app reads
--    them only server-side with the service role (app/api/redeem,
--    app/api/reflections, lib/moderation.ts, the chapter page's
--    hasUnlockCode, and the admin book/chapter pages).
--
--    NOTE: column-level grants are an allowlist. A column added to books or
--    chapters later is NOT readable by anon/authenticated until a migration
--    grants it explicitly.
--
-- 2. Any signed-in user could insert their own book_unlocks row without a
--    code, and the browser wrote user_badges and user_books directly, so
--    the chapter-password check could be skipped. Client INSERT, UPDATE,
--    DELETE (and TRUNCATE) are revoked and the write policies dropped. Rows
--    are now written only by app/api/redeem (after the code check) and
--    app/api/reflections (claim, after the password check), with the
--    service role. The systeme webhook and refunds already used the
--    service role. Reads are unchanged: "users see own book unlocks"
--    (0007) and the public select policies on user_books / user_badges
--    (0037, 0039) stay as they are.
--
-- No data is changed by this migration.

-- ── 1. Codes ────────────────────────────────────────────────────────────────
revoke select on public.books from anon, authenticated;
grant select (
  id, collection_id, slug, title, subtitle, description, cover_image_url,
  gamification_config, sort_order, status, created_at, published_at,
  banner_image_url, reveal_details, placeholder_text, sales_page_url,
  share_banner_image_url, unlock_alert_active, last_unlock_alert_sent_at
) on public.books to anon, authenticated;

revoke select on public.chapters from anon, authenticated;
grant select (
  id, book_id, number, title, milestone_label, reflect_question,
  challenge_text, mux_playback_id, created_at, thumbnail_time
) on public.chapters to anon, authenticated;

-- ── 2. Unlocks, badges, progress: read-only for clients ────────────────────
drop policy if exists "users create own book unlocks" on public.book_unlocks;
revoke insert, update, delete, truncate on public.book_unlocks from anon, authenticated;

drop policy if exists "users manage own badges" on public.user_badges;
drop policy if exists "users can insert own badges" on public.user_badges;
revoke insert, update, delete, truncate on public.user_badges from anon, authenticated;

drop policy if exists "users manage own book progress" on public.user_books;
revoke insert, update, delete, truncate on public.user_books from anon, authenticated;
