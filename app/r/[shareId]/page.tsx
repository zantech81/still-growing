export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUnifiedConnectionCount, getConnectionsSummary } from "@/lib/connections";
import { COUNTRIES } from "@/lib/countries";
import FlagImg from "@/components/FlagImg";

const COUNTRY_NAMES = new Map(COUNTRIES.map((c) => [c.code, c.name]));
// Same overflow cap as app/growing/page.tsx's own country grid, reused
// here rather than reinvented so the two pages agree on when "+N more
// countries" kicks in.
const COUNTRY_DISPLAY_CAP = 9;

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

async function getProgressCaption(admin: ReturnType<typeof createAdminClient>, share: Share): Promise<string | null> {
  const [{ data: userBook }, { count: totalChapters }] = await Promise.all([
    admin.from("user_books").select("badges_earned").eq("user_id", share.user_id).eq("book_id", share.book_id).maybeSingle(),
    admin.from("chapters").select("id", { count: "exact", head: true }).eq("book_id", share.book_id),
  ]);
  if (!totalChapters) return null;
  return `${userBook?.badges_earned ?? 0} of ${totalChapters} badges earned`;
}

async function getReflectionCaption(admin: ReturnType<typeof createAdminClient>, reflectionId: string): Promise<string | null> {
  const { data: reflection } = await admin.from("reflections").select("text").eq("id", reflectionId).maybeSingle();
  if (!reflection) return null;
  return `“${truncate(reflection.text, 140)}”`;
}

async function getGrowingTreeCaption(admin: ReturnType<typeof createAdminClient>, userId: string): Promise<string | null> {
  const [{ data: owner }, connectionCount] = await Promise.all([
    admin.from("users").select("nickname, display_name").eq("id", userId).maybeSingle(),
    getUnifiedConnectionCount(admin, userId),
  ]);
  const name = owner?.nickname ?? owner?.display_name ?? "This reader";
  if (connectionCount === 0) return `${name} is just getting started`;
  if (connectionCount === 1) return `1 person rooting for ${name}'s growth`;
  return `${connectionCount} people rooting for ${name}'s growth`;
}

type GrowingTreeExtra = {
  ownerName: string;
  growingSince: string | null;
  totalCountryCount: number;
  visibleCountries: { code: string; count: number; name: string }[];
  hiddenCountryCount: number;
};

// "Growing since" + the per-country flag breakdown, straight from the
// same getConnectionsSummary this share type's OG headline count already
// uses (see getGrowingTreeCaption above) -- not rebuilt, just the same
// query app/growing/page.tsx runs, reused here for a stranger looking at
// someone else's shared tree instead of the owner's own page. Also
// resolves the owner's name again (a second, separate one-row lookup
// from getGrowingTreeCaption's own): app/growing/page.tsx's "N countries
// growing with you" reads fine in first person on the owner's own page,
// but a stranger reading a shared link isn't the "you" being rooted for,
// so this needs the owner's name instead, matching the third-person
// framing the rest of this page already uses.
async function getGrowingTreeExtra(
  admin: ReturnType<typeof createAdminClient>,
  userId: string
): Promise<GrowingTreeExtra> {
  const [{ data: owner }, { personIds, earliestConnectedAt }] = await Promise.all([
    admin.from("users").select("nickname, display_name").eq("id", userId).maybeSingle(),
    getConnectionsSummary(admin, userId),
  ]);
  const ownerName = owner?.nickname ?? owner?.display_name ?? "this reader";

  const countryCounts = new Map<string, number>();
  if (personIds.length > 0) {
    const { data: connectedUsers } = await admin.from("users").select("country_code").in("id", personIds);
    for (const row of connectedUsers ?? []) {
      if (!row.country_code) continue;
      countryCounts.set(row.country_code, (countryCounts.get(row.country_code) ?? 0) + 1);
    }
  }
  const countryBreakdown = [...countryCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([code, count]) => ({ code, count, name: COUNTRY_NAMES.get(code) ?? code }));
  const visibleCountries = countryBreakdown.slice(0, COUNTRY_DISPLAY_CAP);

  return {
    ownerName,
    growingSince: earliestConnectedAt
      ? new Date(earliestConnectedAt).toLocaleDateString("en", { month: "long", day: "numeric", year: "numeric" })
      : null,
    totalCountryCount: countryBreakdown.length,
    visibleCountries,
    hiddenCountryCount: countryBreakdown.length - visibleCountries.length,
  };
}

// Extra on-page context beneath the hero card, on top of whatever's
// already baked into the OG image itself -- one per share type, since
// each type's meaningful context lives in a different place (a badge's
// chapter, a reflection's own text, a book's progress count, a person's
// connection count).
async function getShareCaption(admin: ReturnType<typeof createAdminClient>, share: Share): Promise<string | null> {
  if (share.type === "badge") {
    return share.reference_id ? getBadgeCaption(admin, share.reference_id) : null;
  }
  if (share.type === "progress") {
    return getProgressCaption(admin, share);
  }
  if (share.type === "reflection") {
    return share.reference_id ? getReflectionCaption(admin, share.reference_id) : null;
  }
  return getGrowingTreeCaption(admin, share.user_id);
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
        <div className="rounded-2xl border border-pink-pale shadow-xl bg-cream overflow-hidden mb-16">
          <img src={imageUrl} alt="Shared from Still Growing" className="w-full block" />
          {(caption ||
            (growingTreeExtra && (growingTreeExtra.growingSince || growingTreeExtra.totalCountryCount > 0)) ||
            (growingTreeExtra && growingTreeExtra.visibleCountries.length > 0)) && (
            <div className="px-8 pt-3 pb-7">
              {caption && <p className="text-center text-sm text-gray-400 mb-2">{caption}</p>}

              {growingTreeExtra && (growingTreeExtra.growingSince || growingTreeExtra.totalCountryCount > 0) && (
                <div className="flex flex-wrap justify-center gap-x-6 gap-y-1 text-xs text-gray-400">
                  {growingTreeExtra.growingSince && <span>Growing since {growingTreeExtra.growingSince}</span>}
                  {growingTreeExtra.totalCountryCount > 0 && (
                    <span>
                      {growingTreeExtra.totalCountryCount}{" "}
                      {growingTreeExtra.totalCountryCount === 1 ? "country" : "countries"} rooting for{" "}
                      {growingTreeExtra.ownerName}&apos;s growth
                    </span>
                  )}
                </div>
              )}

              {growingTreeExtra && growingTreeExtra.visibleCountries.length > 0 && (
                <div className="grid grid-cols-3 gap-x-3 gap-y-2 justify-items-center mt-4 max-w-sm mx-auto text-sm text-ink">
                  {growingTreeExtra.visibleCountries.map(({ code, count, name }) => (
                    <span key={code} className="flex items-center gap-1.5">
                      <FlagImg code={code} className="rounded-sm" />
                      {name} · {count}
                    </span>
                  ))}
                  {growingTreeExtra.hiddenCountryCount > 0 && (
                    <span className="col-span-3 text-gray-400">+{growingTreeExtra.hiddenCountryCount} more countries</span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <>
          <img
            src={imageUrl}
            alt="Shared from Still Growing"
            className="w-full rounded-2xl border border-pink-pale shadow-xl mb-4"
          />
          <div className="mb-16">
            {caption && <p className="text-center text-sm text-gray-400">{caption}</p>}
          </div>
        </>
      )}

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
          A badge and video for every chapter, and your own space to reflect alongside
          other readers. Free lifetime access to the Still Growing app, no subscription,
          ever.
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
