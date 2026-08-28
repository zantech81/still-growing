import type { Metadata } from "next";

// Deliberately static: never gated by middleware.ts's own maintenance
// check (it's in the allowlist there), takes its message via a query
// param set by that same redirect rather than fetching site_settings
// itself, so what's shown always matches exactly what triggered the
// redirect. Same "true public, no data fetching" pattern as
// app/privacy/page.tsx and app/reviews/page.tsx.
export const metadata: Metadata = {
  title: "Be right back — Still Growing",
  robots: { index: false, follow: false },
};

const DEFAULT_MESSAGE =
  "We're making some improvements and will be back shortly. Thanks for your patience!";

export default function MaintenancePage({
  searchParams,
}: {
  searchParams: { message?: string | string[] };
}) {
  const raw = Array.isArray(searchParams.message) ? searchParams.message[0] : searchParams.message;
  const message = raw?.trim() || DEFAULT_MESSAGE;

  return (
    <main className="min-h-screen flex items-center justify-center bg-cream px-6">
      <div className="max-w-sm text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/nav-icon.png"
          alt="Still Growing"
          className="h-20 w-20 mx-auto mb-6 animate-pulse"
        />
        <h1 className="text-3xl font-display text-plum mb-3">Be right back</h1>
        <p className="text-ink leading-relaxed">{message}</p>
      </div>
    </main>
  );
}
