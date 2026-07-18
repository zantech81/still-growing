import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

// Used in Server Components, Route Handlers, and Server Actions.
// Reads/writes the auth cookie so the session survives navigation.
export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // See the matching comment in lib/supabase/admin.ts: Next.js caches
      // fetch() by URL regardless of force-dynamic, which can silently
      // serve a stale row after it changes. This client is used on nearly
      // every authenticated page, so the same staleness risk applies here
      // too, not just for the admin client.
      global: {
        fetch: (input: RequestInfo | URL, init?: RequestInit) =>
          fetch(input, { ...init, cache: "no-store" }),
      },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component that can't set cookies.
            // Safe to ignore if middleware.ts is refreshing sessions.
          }
        },
      },
    }
  );
}
