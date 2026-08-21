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
    }, 2000);
    return () => clearTimeout(timer);
  }, [next, router]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-cream">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/logo-page-header.png"
        alt="Still Growing"
        className="h-16 w-auto animate-pulse"
      />
    </main>
  );
}
