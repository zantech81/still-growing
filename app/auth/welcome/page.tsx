"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Cosmetic branded beat inserted between app/auth/callback/route.ts
// completing sign-in and the reader landing on their real destination --
// requested for marketing video footage, not a fix for any real latency.
// A brief client-side pause is the only place to put this: the callback
// route itself is a server redirect with nowhere to render anything.
// Shortened from 1000ms to 350ms on 2026-08-28: this delay was one of the
// three confirmed contributors to the ~5s post-login gap (see the
// 2026-08-27 investigation, logged in components/AppShell.tsx's
// fetchAppShellData comment) -- still a visible branded beat, but no
// longer stacking a full second on top of the real network wait.
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

  useEffect(() => {
    const timer = setTimeout(() => {
      // replace, not push -- the loading beat shouldn't be a back-button stop.
      router.replace(next);
    }, 350);
    return () => clearTimeout(timer);
  }, [next, router]);

  // Open question, not fully resolved (see the 2026-08-25 investigation
  // notes): testing via supabase.auth.admin.generateLink() showed an
  // admin-generated magic link redirects here with the session as a URL
  // hash fragment (#access_token=...), not a ?code= param. Hash fragments
  // never reach the server, so app/auth/callback/route.ts's `code` check
  // can't see it -- and this page's own client can't process it either,
  // confirmed empirically: @supabase/ssr's createBrowserClient hardcodes
  // flowType: "pkce" (see node_modules/@supabase/ssr/dist/main/
  // createBrowserClient.js), which only looks for ?code=, not a hash.
  // Calling getSession() here does NOT recover that case, so it's kept as
  // an independent, non-blocking effect rather than something the redirect
  // above waits on -- an earlier version chained the redirect after this,
  // and that made the "1 second" pause take ~2 seconds instead (getSession
  // itself isn't free), for zero actual benefit in the case it was meant
  // to protect. Harmless and possibly still useful for the case that IS
  // covered (Google OAuth's proper PKCE code flow, where the cookie is
  // already set server-side by the time this page loads, so this just
  // reads it).
  //
  // What's genuinely uncertain: whether a REAL user's magic link (sent via
  // the actual login page's signInWithOtp() call, from a real
  // PKCE-configured browser) behaves the same way as the admin-generated
  // test links above -- Supabase's own docs suggest a PKCE-initiated
  // request should get a PKCE-compatible ?code= link back, which the
  // existing server-side exchangeCodeForSession already handles fine.
  // Admin-generated links are a different code path with no client-side
  // PKCE context, so this may just be a test-methodology artifact rather
  // than a real bug -- couldn't fully verify either way without a real
  // email inbox to click through. Flagged for Zan to confirm with a real
  // email sign-in.
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().catch(() => {});
  }, []);

  // Systeme.io contact sync moved here as a real client-initiated request
  // rather than running inside the callback route -- that's the only
  // mechanism confirmed to reliably finish (see the long comment in
  // app/auth/callback/route.ts and app/api/auth/sync-contact/route.ts for
  // why). Not awaited -- the redirect above fires on its own regardless --
  // but `keepalive: true` lets the request survive that redirect rather
  // than being cancelled when this page unmounts.
  useEffect(() => {
    fetch("/api/auth/sync-contact", { method: "POST", keepalive: true }).catch(() => {});
  }, []);

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
