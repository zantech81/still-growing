import Link from "next/link";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://stillgrowing.co";

type Review = {
  id: string;
  rating: number;
  text: string;
  display_name_override: string | null;
  is_featured: boolean;
};

// Best-effort: a fetch failure here should never break the landing page
// itself, it should just mean the section quietly doesn't render.
async function getFeaturedReviews(): Promise<Review[]> {
  try {
    const res = await fetch(`${siteUrl}/api/reviews/public`, { cache: "no-store" });
    const data = await res.json().catch(() => ({ reviews: [] }));
    const reviews: Review[] = data.reviews ?? [];
    return reviews.filter((r) => r.is_featured).slice(0, 3);
  } catch {
    return [];
  }
}

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5 justify-center" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <svg
          key={n}
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill={n <= rating ? "#E5B94E" : "none"}
          stroke={n <= rating ? "#E5B94E" : "#E5E7EB"}
          strokeWidth="1.5"
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
    </div>
  );
}

// This page is the digital continuation of "Your Journey Continues",
// the closing CTA page in the book. Same three-point pitch, same voice,
// same "Begin" language. Anyone landing here typed in the plain
// stillgrowing.co URL from the book (not a /baby/chN deep link).
export default async function HomePage() {
  const featuredReviews = await getFeaturedReviews();

  return (
    <main className="max-w-xl mx-auto px-6 py-20 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/logo-page-header.png" alt="Still Growing" className="h-14 w-auto mx-auto mb-8" />
      <h1 className="text-4xl mb-2">Your Journey Continues</h1>
      <p className="italic text-pink-deep mb-8">Where the badges become real</p>

      <p className="mb-10 leading-relaxed">
        Every badge in this book has a home online. A short video that goes with it,
        and a circle of people walking the same twelve chapters as you.
        Nothing to buy, nothing to prove. Just bring your reflections.
      </p>

      <ul className="text-left space-y-4 mb-10 max-w-sm mx-auto">
        <li className="flex gap-3">
          <span>🎥</span>
          <span>Watch a short video reward for every badge you claim</span>
        </li>
        <li className="flex gap-3">
          <span>💬</span>
          <span>Share your own reflection, your version of the story</span>
        </li>
        <li className="flex gap-3">
          <span>🫂</span>
          <span>Read what this journey means to others in the Circle</span>
        </li>
      </ul>

      <Link
        href="/login"
        className="inline-block bg-pink-pale hover:bg-pink-dusty transition-colors text-pink-deep font-display text-xl px-10 py-4 rounded-xl2"
      >
        Begin
      </Link>
      <p className="italic text-sm text-gray-500 mt-4">
        Free to join. Your first badge is already waiting.
      </p>
      <p className="text-sm mt-3">
        <Link href="/reviews" className="text-pink-deep hover:underline">
          Read what other readers are saying →
        </Link>
      </p>

      {featuredReviews.length > 0 && (
        <div className="mt-16 pt-12 border-t border-pink-pale text-left">
          <p className="text-xs uppercase tracking-widest text-pink-deep mb-6 text-center">
            What readers are saying
          </p>
          <div className="space-y-4">
            {featuredReviews.map((r) => (
              <div key={r.id} className="bg-white border border-pink-pale rounded-xl2 p-5">
                <Stars rating={r.rating} />
                <p className="text-ink leading-relaxed italic mt-3 mb-2 text-sm">
                  &ldquo;{r.text}&rdquo;
                </p>
                <p className="text-xs text-gray-400">{r.display_name_override ?? "A reader"}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
