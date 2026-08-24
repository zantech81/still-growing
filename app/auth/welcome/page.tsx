"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Cosmetic branded beat inserted between app/auth/callback/route.ts
// completing sign-in and the reader landing on their real destination --
// requested for marketing video footage, not a fix for any real latency.
// A brief client-side pause is the only place to put this: the callback
// route itself is a server redirect with nowhere to render anything.
export default function AuthWelcomePage() {
  return (
    <Suspense>
      <Welcome />
    </Suspense>
  );
}

function Welcome() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/library";

  // CRITICAL: email magic-link sign-in delivers the session as a URL hash
  // fragment (#access_token=...), not a ?code= param -- confirmed directly
  // against real production traffic 2026-08-25. Hash fragments never reach
  // the server, so app/auth/callback/route.ts's `code` check can't see it;
  // nothing ever established a session for it until this page's own
  // client processes it. Before this fix, nothing did: this page had no
  // supabase client of its own, and the redirect below is a client-side
  // router.replace (no full page load), which silently strips the hash
  // from the URL before any *later* page's client could see it either --
  // so email sign-in was landing everyone on /library with no real
  // session at all. Google OAuth (proper PKCE code flow) was never
  // affected by this, only the email magic-link path.
  //
  // createClient()'s detectSessionInUrl (default true) picks up and
  // persists that hash-fragment session to cookies -- but only if it
  // resolves before the redirect changes the URL, so the redirect timer
  // is chained after this rather than running as an independent effect:
  // a fixed 1000ms felt "probably enough" but isn't a guarantee, and
  // getting this wrong is exactly how the bug happened in the first
  // place.
  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    supabase.auth.getSession().finally(() => {
      if (cancelled) return;

      // Systeme.io contact sync moved here as a real client-initiated
      // request rather than running inside the callback route -- that's
      // the only mechanism confirmed to reliably finish (see the long
      // comment in app/auth/callback/route.ts and
      // app/api/auth/sync-contact/route.ts for why). Needs the session
      // cookie above to already be set to identify the user. Not awaited
      // itself -- the redirect below fires regardless -- but
      // `keepalive: true` lets the request survive that redirect rather
      // than being cancelled when this page unmounts.
      fetch("/api/auth/sync-contact", { method: "POST", keepalive: true }).catch(() => {});

      setTimeout(() => {
        if (cancelled) return;
        // replace, not push -- the loading beat shouldn't be a back-button stop.
        router.replace(next);
      }, 1000);
    });

    return () => {
      cancelled = true;
    };
  }, [next, router]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-cream">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/nav-icon.png"
        alt="Sprout"
        className="h-32 w-32 animate-pulse"
      />
    </main>
  );
}
