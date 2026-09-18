import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import SproutIllustration from "@/components/SproutIllustration";
import AvatarStack from "@/components/AvatarStack";

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

// Cold-customer CTA: this page is the one a stranger who's never bought
// the book actually lands on (see the header comment below), so this is
// where a "don't have it yet?" link belongs -- not /login, which is
// reached only after already clicking Begin. Same shape as
// app/library/page.tsx's promo fetch, scoped to "published" so a
// coming_soon book (no real sales page yet) is never linked here.
async function getSalesUrl(): Promise<string | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("books")
    .select("sales_page_url")
    .eq("status", "published")
    .order("sort_order")
    .limit(1)
    .maybeSingle();
  return data?.sales_page_url ?? null;
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
          stroke={n <= rating ? "#E5B94E" : "rgba(58, 58, 58, 0.2)"}
          strokeWidth="1.5"
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
    </div>
  );
}

// This page is the digital continuation of the book's own closing CTA
// page. Anyone landing here typed in the plain stillgrowing.co URL from
// the book (not a /baby/chN deep link). Hero is Direction B, the site-wide
// illustrated-warmth system's flagship instance (see DESIGN.md's
// Illustration section); everything below it is the pre-existing pitch,
// unchanged in content, just relocated under the new hero.
export default async function HomePage() {
  const [featuredReviews, salesUrl] = await Promise.all([getFeaturedReviews(), getSalesUrl()]);

  return (
    <main className="px-6 py-16 md:py-20">
      <div className="max-w-3xl mx-auto">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/logo-page-header.png" alt="Still Growing" className="h-14 w-auto mx-auto mb-10 md:mb-14" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-center">
          <div className="order-1 md:order-2 flex justify-center">
            <SproutIllustration size="hero" />
          </div>

          <div className="order-2 md:order-1 text-center md:text-left">
            <h1 className="text-4xl md:text-5xl leading-tight mb-5">
              Every chapter. Every badge. One growing circle.
            </h1>
            <p className="leading-relaxed mb-6 md:pr-6">
              Every badge in the book has a home online -- a short video, a place for your own
              reflection, and a circle of people walking these chapters alongside you. Nothing
              to buy, nothing to prove.
            </p>
            <div className="flex justify-center md:justify-start mb-7">
              <AvatarStack />
            </div>
            <Link
              href="/login"
              className="inline-block bg-pink-pale hover:bg-pink-dusty transition-colors text-pink-deep font-display text-xl px-10 py-4 rounded-xl2"
            >
              Begin
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto text-center mt-12 md:mt-14">
        <ul className="text-left space-y-4 mb-10">
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

        <p className="italic text-sm text-gray-500 mb-3">
          Free to join. Your first badge is already waiting.
        </p>
        <p className="text-sm">
          <Link href="/reviews" className="text-pink-deep hover:underline">
            Read what other readers are saying →
          </Link>
        </p>

        {salesUrl && (
          <p className="text-xs text-gray-400 mt-6">
            Don&apos;t have the book yet?{" "}
            <a href={`${salesUrl}?ref=begin-cold`} className="underline hover:text-pink-deep transition-colors">
              Get it here →
            </a>
          </p>
        )}

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
      </div>
    </main>
  );
}
