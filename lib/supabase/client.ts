import { createBrowserClient } from "@supabase/ssr";

// Used in Client Components. Public anon key only — RLS policies do the
// actual access control (see supabase/migrations/0002_rls.sql).
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
