export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://stillgrowing.co";

type Share = {
  id: string;
  type: "badge" | "progress" | "reflection" | "growing_tree";
  user_id: string;
  book_id: string;
  reference_id: string | null;
};

async function getShare(shareId: string): Promise<Share | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("shares")
    .select("id, type, user_id, book_id, reference_id")
    .eq("id", shareId)
    .maybeSingle();
  return data;
}

// Extra on-page context beneath the hero card, on top of whatever's
// already baked into the OG image itself. Currently wired up for badge
// shares only (the chapter it was earned in) -- reflection/progress/
// growing_tree get the same enlarged hero + demoted book section, but no
// equivalent caption yet, pending confirmation of this same treatment
// for those three.
async function getBadgeChapterCaption(
  admin: ReturnType<typeof createAdminClient>,
  badgeId: string
): Promise<string | null> {
  const { data: badge } = await admin.from("badges").select("chapter_id").eq("id", badgeId).maybeSingle();
  if (!badge) return null;
  const { data: chapter } = await admin
    .from("chapters")
    .select("number, title")
    .eq("id", badge.chapter_id)
    .maybeSingle();
  if (!chapter) return null;
  return `Chapter ${chapter.number}: ${chapter.title}`;
}

// Public route: looked up with the service-role client, same as the OG
// image route, never through the browser-facing PostgREST API (see the
// RLS comment in supabase/migrations/0023_shares.sql).
export async function generateMetadata({
  params,
}: {
  params: { shareId: string };
}): Promise<Metadata> {
  const share = await getShare(params.shareId);
  if (!share) return {};

  const imageUrl = `${siteUrl}/api/og/${share.type}/${share.id}`;
  const pageUrl = `${siteUrl}/r/${share.id}`;
  const title =
    share.type === "badge"
      ? "A badge earned on Still Growing"
      : share.type === "progress"
      ? "My Still Growing journey"
      : share.type === "growing_tree"
      ? "A Growing Tree on Still Growing"
      : "A reflection from Still Growing";
  const description = "Every badge in this book has a home online. See what Still Growing is about.";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: pageUrl,
      type: "website",
      siteName: "Still Growing",
      images: [{ url: imageUrl, width: 1200, height: 630 }],
    },
    twitter: { card: "summary_large_image", title, description, images: [imageUrl] },
  };
}

// "A reader shared X with you": generic on purpose (no sharer attribution
// fetched or shown), naturally adapted per share type for a stranger with
// zero prior context on what they're looking at.
function framingLine(type: Share["type"]): string {
  if (type === "reflection") return "A reader shared this reflection from their journey.";
  if (type === "growing_tree") return "A reader shared the people rooting for their growth.";
  return "A reader shared their journey with you.";
}

export default async function ShareLandingPage({ params }: { params: { shareId: string } }) {
  const share = await getShare(params.shareId);
  if (!share) notFound();

  const admin = createAdminClient();
  const [{ data: book }, caption] = await Promise.all([
    admin
      .from("books")
      .select("slug, title, cover_image_url, sales_page_url")
      .eq("id", share.book_id)
      .maybeSingle(),
    share.type === "badge" && share.reference_id
      ? getBadgeChapterCaption(admin, share.reference_id)
      : Promise.resolve(null),
  ]);

  // The real Systeme.io sales page URL can't be derived from the book
  // slug (it needs a specific admin-entered path), so the CTA only shows
  // when one has actually been set, rather than link to a guessed URL.
  const salesUrl = book?.sales_page_url || null;
  const imageUrl = `/api/og/${share.type}/${share.id}`;

  return (
    <main className="max-w-2xl mx-auto px-6 py-16">
      {/* The shared content is the whole reason someone clicked this
          link, so it's the hero: largest element on the page, generous
          space around it, nothing else competing for attention above
          the fold. The book pitch below is deliberately smaller and
          narrower (a nested max-w-sm column vs. this max-w-2xl outer
          one) so the width contrast itself signals "supporting act,"
          not just font size. */}
      <p className="text-center text-sm text-pink-deep italic mb-8">{framingLine(share.type)}</p>

      <img
        src={imageUrl}
        alt="Shared from Still Growing"
        className="w-full rounded-2xl border border-pink-pale shadow-xl mb-4"
      />
      {caption && (
        <p className="text-center text-sm text-gray-400 mb-16">{caption}</p>
      )}
      {!caption && <div className="mb-16" />}

      {/* Book pitch, written for cold traffic with zero prior context.
          Deliberately compact: a thumbnail (not a full lifestyle photo)
          and a couple of tight lines, "here's where this came from, want
          the same thing?" rather than a competing product page. Scoped to
          this page only, do not port this back to app/page.tsx: the
          homepage's "Your Journey Continues" copy is for readers who
          already own the book, this is for strangers who don't yet. */}
      <div className="max-w-sm mx-auto text-center border-t border-pink-pale pt-10">
        <div className="flex items-center gap-4 mb-4 text-left">
          {book?.cover_image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={book.cover_image_url}
              alt={book?.title ?? "Book cover"}
              className="w-[50px] h-[66px] object-cover rounded-lg flex-shrink-0 border border-gray-100"
            />
          )}
          <div>
            <h1 className="font-display text-plum text-lg leading-snug">Life Lessons from a Baby</h1>
            <p className="text-xs text-gray-400 leading-snug">
              What the smallest humans teach us about living, loving, and growing up
            </p>
          </div>
        </div>

        <p className="text-xs text-gray-400 mb-6 leading-relaxed">
          Free ebook access, a badge and video for every chapter, and your own space to
          reflect alongside other readers.
        </p>

        {salesUrl && (
          <a
            href={salesUrl}
            className="inline-block bg-pink-pale hover:bg-pink-dusty transition-colors text-pink-deep font-display text-base px-8 py-3 rounded-xl2"
          >
            Get the Book →
          </a>
        )}

        <p className="text-xs text-gray-400 mt-4">
          Already have your copy?{" "}
          <Link href="/login" className="text-pink-deep hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
