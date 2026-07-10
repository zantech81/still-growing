import { createClient } from "@supabase/supabase-js";

// Service-role client — bypasses RLS entirely, so every table is fully readable
// and writable. Never import this in client components or expose it to the browser.
// Keep call sites minimal and narrowly scoped; prefer the cookie-based createClient()
// for anything that can run under the authenticated user's own session.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
