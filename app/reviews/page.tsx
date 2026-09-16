export const dynamic = "force-dynamic";

import AppShell from "@/components/AppShell";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://stillgrowing.co";

type Review = {
  id: string;
  rating: number;
  text: string;
  display_name_override: string | null;
  created_at: string;
  is_featured: boolean;
};

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <svg
          key={n}
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill={n <= rating ? "#E5B94E" : "none"}
          stroke={n <= rating ? "#E5B94E" : "rgba(58, 58, 58, 0.2)"}
          strokeWidth="1.5"
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
    </div>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en", { month: "short", year: "numeric" });
}

// Public page, reachable two ways: signed-out cold traffic (app/page.tsx's
// "Read what other readers are saying" link, same pattern as app/page.tsx
// itself and app/r/[shareId]/page.tsx) AND signed-in users browsing from
// inside the app (app/[book]/page.tsx links here too, from the reader
// journey). The second path used to leave a real dead end: no AppNav, no
// back link, and on the installed PWA (site.webmanifest: display
// "standalone") there's no browser chrome to fall back on either. Wrapping
// in AppShell fixes that -- AppNav (and a way back) for anyone with an
// active session, while AppShell's own signed-out fallback keeps this
// exactly as nav-free as before for anonymous visitors (2026-09-16).
// Fetches through the public API route rather than querying reviews
// directly, same separation app/r/[shareId]/page.tsx already draws
// between "the page" and "the service-role-gated data access" --
// public/embeds/reviews-widget.js reuses the exact same endpoint, so
// there's only one place that ever decides what's safe to show publicly.
export default async function ReviewsPage() {
  const res = await fetch(`${siteUrl}/api/reviews/public`, { cache: "no-store" });
  const data = await res.json().catch(() => ({ reviews: [] }));
  const reviews: Review[] = data.reviews ?? [];

  return (
    <AppShell>
      <main className="max-w-2xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo-page-header.png" alt="Still Growing" className="h-12 w-auto mx-auto mb-6" />
          <h1 className="text-4xl mb-2">What readers are saying</h1>
          <p className="text-gray-400 italic text-sm">Real words from real readers.</p>
        </div>

        {reviews.length === 0 ? (
          <p className="text-center text-gray-400 italic py-16">
            No reviews yet. Be the first to share yours.
          </p>
        ) : (
          <div className="space-y-4">
            {reviews.map((r) => (
              <div key={r.id} className="bg-white border border-pink-pale rounded-xl2 p-6">
                <Stars rating={r.rating} />
                <p className="text-ink leading-relaxed italic mt-3 mb-3">&ldquo;{r.text}&rdquo;</p>
                <p className="text-sm text-gray-400">
                  {r.display_name_override ?? "A reader"} · {formatDate(r.created_at)}
                </p>
              </div>
            ))}
          </div>
        )}
      </main>
    </AppShell>
  );
}
