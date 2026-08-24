"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

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

  useEffect(() => {
    const timer = setTimeout(() => {
      // replace, not push -- the loading beat shouldn't be a back-button stop.
      router.replace(next);
    }, 1000);
    return () => clearTimeout(timer);
  }, [next, router]);

  // Systeme.io contact sync used to run inside app/auth/callback/route.ts
  // itself; moved here as a real client-initiated request instead, since
  // that's the only mechanism that was actually confirmed to reliably
  // finish (see the long comment in app/auth/callback/route.ts and
  // app/api/auth/sync-contact/route.ts for why). Not awaited -- this page
  // redirects on its own 1s timer regardless -- but `keepalive: true`
  // lets the request survive that redirect rather than being cancelled
  // when this page unmounts.
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
