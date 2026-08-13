export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { getGrowingTreeExtra } from "@/lib/connections";
import GrowingTreeStats from "@/components/GrowingTreeStats";
import BookPromo from "@/components/BookPromo";

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

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 1).trimEnd() + "…";
}

async function getBadgeCaption(admin: ReturnType<typeof createAdminClient>, badgeId: string): Promise<string | null> {
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

async function getReflectionCaption(admin: ReturnType<typeof createAdminClient>, reflectionId: string): Promise<string | null> {
  const { data: reflection } = await admin.from("reflections").select("text").eq("id", reflectionId).maybeSingle();
  if (!reflection) return null;
  return `“${truncate(reflection.text, 140)}”`;
}

// Extra on-page context beneath the hero card, on top of whatever's
// already baked into the OG image itself. badge and reflection each add
// something the image doesn't already say (which chapter, the reflection's
// own text). progress and growing_tree get no caption here: both would
// just repeat their OG image's own headline text verbatim ("X of Y badges
// earned" / "N people rooting for {name}'s growth") -- progress has no
// further context beyond that to add, and growing_tree's genuinely new
// context (growing-since date, country breakdown) is handled separately
// by getGrowingTreeExtra below.
async function getShareCaption(admin: ReturnType<typeof createAdminClient>, share: Share): Promise<string | null> {
  if (share.type === "badge") {
    return share.reference_id ? getBadgeCaption(admin, share.reference_id) : null;
  }
  if (share.type === "reflection") {
    return share.reference_id ? getReflectionCaption(admin, share.reference_id) : null;
  }
  return null;
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
  const [{ data: book }, caption, growingTreeExtra] = await Promise.all([
    admin
      .from("books")
      .select("slug, title, cover_image_url, sales_page_url")
      .eq("id", share.book_id)
      .maybeSingle(),
    getShareCaption(admin, share),
    share.type === "growing_tree" ? getGrowingTreeExtra(admin, share.user_id) : Promise.resolve(null),
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

      {share.type === "growing_tree" ? (
        // Merged into one card rather than image-plus-floating-text below
        // it: the OG image already bakes its own "STILL GROWING" +
        // share-URL footer into its pixels (lib/og/renderShareImage.tsx,
        // out of scope here), so the border/shadow/rounded corners move
        // from the <img> itself onto this wrapper, both share the exact
        // same cream (#FBF7F2) background as the image's own canvas, and
        // the stats render below the whole image -- inside the same
        // continuous card, not above the baked-in footer, since nothing
        // can render "between" pixels already flattened into one PNG.
        <div className="rounded-2xl border border-pink-pale shadow-xl bg-cream overflow-hidden mb-6">
          <img src={imageUrl} alt="Shared from Still Growing" className="w-full block" />
          {growingTreeExtra && <GrowingTreeStats extra={growingTreeExtra} className="px-8 pt-3 pb-7" />}
        </div>
      ) : (
        <>
          <img
            src={imageUrl}
            alt="Shared from Still Growing"
            className="w-full rounded-2xl border border-pink-pale shadow-xl mb-4"
          />
          <div className="mb-6">
            {/* Reflection's caption is the same quote already baked into
                the OG image above (only there for crawlers/screen readers
                that can't parse the Satori-rendered <img>), so it's
                sr-only here -- a sighted visitor would otherwise see the
                quote repeated a third time (once in the social preview,
                once in the image, once here). Badge's caption ("Chapter
                N: Title") isn't a duplicate of anything in the badge
                image, so it stays visible. */}
            {caption && (
              <p className={share.type === "reflection" ? "sr-only" : "text-center text-sm text-gray-400"}>
                {caption}
              </p>
            )}
          </div>
        </>
      )}

      <p className="max-w-sm mx-auto text-center text-xs text-gray-400 mb-16">
        Part of a 12-chapter journey with badges and reader reflections.
      </p>

      {/* Book pitch, written for cold traffic with zero prior context.
          Scoped to this page (and app/u/[userId]/page.tsx, under its own
          logged-out-only condition) only, do not port this back to
          app/page.tsx: the homepage's "Your Journey Continues" copy is
          for readers who already own the book, this is for strangers
          who don't yet. */}
      <BookPromo coverImageUrl={book?.cover_image_url ?? null} salesUrl={salesUrl} />
    </main>
  );
}
