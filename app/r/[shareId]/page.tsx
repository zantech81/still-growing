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
};

async function getShare(shareId: string): Promise<Share | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("shares")
    .select("id, type, user_id, book_id")
    .eq("id", shareId)
    .maybeSingle();
  return data;
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
  const { data: book } = await admin
    .from("books")
    .select("slug, title, share_banner_image_url, sales_page_url")
    .eq("id", share.book_id)
    .maybeSingle();

  // The real Systeme.io sales page URL can't be derived from the book
  // slug (it needs a specific admin-entered path), so the CTA only shows
  // when one has actually been set, rather than link to a guessed URL.
  const salesUrl = book?.sales_page_url || null;
  // Dedicated field for this page only, no fallback to cover_image_url or
  // banner_image_url: those are a different aspect ratio (portrait) for a
  // different page (Library thumbnail, Journey banner), so falling back to
  // either here would stretch or crop the wrong-shaped image into this box.
  const shareBannerUrl = book?.share_banner_image_url || null;
  const imageUrl = `/api/og/${share.type}/${share.id}`;

  return (
    <main className="max-w-xl mx-auto px-6 py-16 text-center">
      {/* The shared content itself, first: whoever clicked this link
          expects to immediately see the specific thing that was shared
          with them, before anything else, including the pitch below. */}
      <p className="text-sm text-pink-deep italic mb-6">{framingLine(share.type)}</p>
      <img
        src={imageUrl}
        alt="Shared from Still Growing"
        className="w-full rounded-xl2 border border-pink-pale mb-16"
      />

      {/* Book pitch, written for cold traffic with zero prior context.
          Scoped to this page only, do not port this back to app/page.tsx:
          the homepage's "Your Journey Continues" copy is for readers who
          already own the book, this is for strangers who don't yet. */}
      {shareBannerUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={shareBannerUrl}
          alt={book?.title ?? "Book cover"}
          // This page's banner is a landscape tablet-mockup-in-a-room scene
          // (1376x786), a different shape from the Journey page's portrait
          // book cover. aspect-[1376/786] uses the exact pixel ratio rather
          // than a rounded approximation like 16:9, so the box never
          // letterboxes or crops a correctly-sized upload. Fed by its own
          // dedicated share_banner_image_url field, set independently in
          // admin from the Library and Journey page images.
          className="w-full rounded-xl2 border border-pink-pale mb-6 object-cover aspect-[1376/786]"
        />
      )}

      <h1 className="text-4xl mb-2">Life Lessons from a Baby</h1>
      <p className="italic text-pink-deep mb-8">
        What the smallest humans teach us about living, loving, and growing up, at any age
      </p>

      <p className="mb-10 leading-relaxed">
        Every single one of us started the same way. Small, helpless, and completely
        unaware of how extraordinary we already were. Then somewhere along the way, we
        forgot. This ebook takes twelve real developmental milestones, the ones every
        baby goes through, and turns each one into a lesson for your life right now.
        Twelve short chapters. Twelve real challenges. Read one in a few minutes, or
        take your time with all twelve.
      </p>

      <div className="text-left mb-10 max-w-sm mx-auto">
        <h2 className="text-xs uppercase tracking-widest text-gray-400 mb-4">
          What you get, in one purchase
        </h2>
        <ul className="space-y-4">
          <li className="flex gap-3">
            <span>📖</span>
            <span>The full ebook, instant digital download, start reading in minutes</span>
          </li>
          <li className="flex gap-3">
            <span>🔓</span>
            <span>Free lifetime access to the Still Growing app, no subscription, ever</span>
          </li>
          <li className="flex gap-3">
            <span>🎥</span>
            <span>A badge and a short video reward for every chapter you complete</span>
          </li>
          <li className="flex gap-3">
            <span>🫂</span>
            <span>
              Your own space to share your progress and reflections, and read what other
              readers are learning too
            </span>
          </li>
        </ul>
      </div>

      {salesUrl && (
        <a
          href={salesUrl}
          className="inline-block bg-pink-pale hover:bg-pink-dusty transition-colors text-pink-deep font-display text-xl px-10 py-4 rounded-xl2"
        >
          Get the Book →
        </a>
      )}

      <p className="text-sm text-gray-400 mt-4">
        Already have your copy?{" "}
        <Link href="/login" className="text-pink-deep hover:underline">
          Sign in
        </Link>
      </p>
    </main>
  );
}
