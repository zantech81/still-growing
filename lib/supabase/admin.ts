import { createClient } from "@supabase/supabase-js";

// Service-role client. Bypasses RLS entirely, so every table is fully readable
// and writable. Never import this in client components or expose it to the browser.
// Keep call sites minimal and narrowly scoped; prefer the cookie-based createClient()
// for anything that can run under the authenticated user's own session.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false },
      // Next.js patches the global fetch() to cache GET requests by URL,
      // even on routes marked force-dynamic (that directive controls
      // whether the route/page is statically rendered, not whether
      // individual library-internal fetch calls are cached). Without
      // this, a repeated identical query (e.g. the same book row
      // fetched across multiple requests) can silently serve a stale
      // response after the underlying row changes. Confirmed live: a
      // book's sales_page_url update wasn't reflected on /r/[shareId]
      // until this was added, despite the page being force-dynamic and
      // the database write being independently confirmed.
      global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) },
    }
  );
}
