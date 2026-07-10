import { createClient } from "@supabase/supabase-js";

// Service-role client — bypasses RLS. Never import this in client components
// or expose it to the browser. Only use in server-side trusted contexts.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
