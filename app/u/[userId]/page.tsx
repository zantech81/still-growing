export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getGrowingTreeExtra, getSharedReflectionCount } from "@/lib/connections";
import { isVerifiedBuyer } from "@/lib/purchases";
import VerifiedBadge from "@/components/VerifiedBadge";
import AppShell from "@/components/AppShell";
import GrowingTree from "@/components/GrowingTree";
import GrowingTreeStats from "@/components/GrowingTreeStats";
import Avatar from "@/components/Avatar";
import ShareButton from "@/components/ShareButton";
import BookPromo from "@/components/BookPromo";
import ProfileRootFor from "@/components/ProfileRootFor";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://stillgrowing.co";

// Public route, same as app/r/[shareId]/page.tsx: looked up with the
// admin client since a social platform's scraper (or a signed-out
// visitor) has no session/cookies to authenticate a request with.
export async function generateMetadata({
  params,
}: {
  params: { userId: string };
}): Promise<Metadata> {
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("public_profiles")
    .select("nickname, display_name")
    .eq("id", params.userId)
    .maybeSingle();

  if (!profile) return {};

  const name = profile.nickname ?? profile.display_name ?? "This reader";
  const title = `${name} on Still Growing`;
  const description = `See ${name}'s growing tree, badges, and journey on Still Growing.`;
  const imageUrl = `${siteUrl}/api/og/profile/${params.userId}`;
  const pageUrl = `${siteUrl}/u/${params.userId}`;

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

type BookRow = {
  book_id: string;
  badges_earned: number;
  books: { title: string; slug: string } | { title: string; slug: string }[] | null;
};

type BadgeRow = {
  book_id: string;
  badges: { name: string; badge_image_url: string | null } | { name: string; badge_image_url: string | null }[] | null;
};

// PostgREST returns many-to-one joins as a single object, but normalize
// defensively in case the shape ever comes back as an array (same
// precaution CircleFeed.tsx already takes for its own users(...) join).
function one<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

export default async function ProfilePage({ params }: { params: { userId: string } }) {
  // Deliberately public: no auth check/redirect here, same as
  // app/r/[shareId]/page.tsx. A signed-out visitor (or a scraper with no
  // session at all) queries through as the anon role -- every table this
  // page reads from has RLS already scoped correctly for that
  // (public_profiles, user_books/user_badges/profile_pins' public select
  // policies, reflections' is_hidden-or-own-row policy) plus the matching
  // anon grants added in 0039_public_profile_anon_grants.sql. A signed-in
  // viewer still gets their own session's client here, used only to
  // determine isOwnProfile below.
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // public_profiles, not users directly: this is a VIEWED user, not
  // (necessarily) the caller, and public.users' own RLS is scoped to
  // "own row or admin" (see 0033_users_rls_column_scoping.sql). This
  // view has no row restriction of its own, only a safe column subset.
  const { data: profile } = await supabase
    .from("public_profiles")
    .select("id, nickname, display_name, avatar_key, avatar_color, country_code")
    .eq("id", params.userId)
    .maybeSingle();

  if (!profile) notFound();

  const name = profile.nickname ?? profile.display_name;
  const isOwnProfile = user?.id === params.userId;

  // Book promo: shown only to a signed-out viewer (cold traffic from a
  // shared link, or an existing reader not signed in on this device) --
  // never to any logged-in reader, whether they're viewing their own
  // profile or someone else's, since being logged in already means they
  // have access to the book. Not tied to the profile owner's own
  // books/progress at all (this is generic "here's the product" framing,
  // same as app/r/[shareId]/page.tsx), so skipped entirely -- no query --
  // whenever there's a session, rather than fetched and simply not
  // rendered.
  const { data: promoBook } = user
    ? { data: null }
    : await supabase
        .from("books")
        .select("cover_image_url, sales_page_url")
        .eq("status", "published")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

  // Verified-buyer badge: looked up via the admin client because the
  // email itself has to come from public.users (never exposed through
  // public_profiles -- that view is a deliberately safe column subset,
  // see 0033_users_rls_column_scoping.sql / 0036_avatar_key.sql), and a
  // signed-out or other-user viewer has no RLS access to another
  // account's email at all. The email is only ever used here, server-side,
  // to derive the boolean below -- it's never sent to the client or
  // rendered anywhere on this public page. See lib/purchases.ts for why
  // this is a live check rather than a stored flag.
  const emailLookup = createAdminClient()
    .from("users")
    .select("email")
    .eq("id", params.userId)
    .maybeSingle();

  // Only queried when there's actually a viewer who could root for this
  // profile (signed in, not their own) -- same "skip the query entirely
  // when it can't matter" pattern as promoBook above, not fetched and
  // simply unused.
  const alreadyRootingPromise =
    user && !isOwnProfile
      ? supabase
          .from("connections")
          .select("rooter_id")
          .eq("rooter_id", user.id)
          .eq("rooted_for_id", params.userId)
          .maybeSingle()
      : Promise.resolve({ data: null });

  const [
    growingTreeExtra,
    sharedReflectionCount,
    { data: userBooks },
    { data: earnedBadges },
    { data: pins },
    { data: emailRow },
    { data: existingConnection },
  ] = await Promise.all([
    getGrowingTreeExtra(supabase, params.userId),
    getSharedReflectionCount(supabase, params.userId),
    supabase
      .from("user_books")
      .select("book_id, badges_earned, books(title, slug)")
      .eq("user_id", params.userId),
    supabase
      .from("user_badges")
      .select("book_id, badges(name, badge_image_url)")
      .eq("user_id", params.userId),
    supabase
      .from("profile_pins")
      .select("reflection_id")
      .eq("user_id", params.userId)
      .order("display_order", { ascending: true }),
    emailLookup,
    alreadyRootingPromise,
  ]);
  const connectionCount = growingTreeExtra.connectionCount;
  const verifiedBuyer = await isVerifiedBuyer(emailRow?.email as string | undefined);

  // Joined live against reflections at render time, never denormalized:
  // reflections' own RLS ("is_hidden = false or auth.uid() = user_id",
  // see 0002_rls.sql) still applies here, so even if a stale pin row
  // somehow survived whatever should have removed it (see the
  // reflections_unpin_on_hide trigger, 0038_profile_pins.sql), a hidden
  // reflection's text still can't reach a stranger viewing this page --
  // a second, independent enforcement layer under the trigger.
  const pinnedIds = (pins ?? []).map((p) => p.reflection_id as string);
  const { data: pinnedReflections } =
    pinnedIds.length > 0
      ? await supabase
          .from("reflections")
          .select("id, text, chapter_number")
          .in("id", pinnedIds)
      : { data: [] as { id: string; text: string; chapter_number: number }[] };
  const reflectionsById = new Map((pinnedReflections ?? []).map((r) => [r.id, r]));
  // Re-ordered to match pinnedIds (the caller's own display_order), since
  // .in() doesn't guarantee result order matches the input array.
  const pinned = pinnedIds.map((id) => reflectionsById.get(id)).filter((r): r is NonNullable<typeof r> => !!r);

  // Grouped by book_id from the start, per the multi-book
  // future-proofing pattern already established elsewhere (see
  // connections.book_id, 0031_connections_book_id.sql): costs nothing
  // today with one published book, and means nothing here needs
  // restructuring once a second book exists.
  const badgesByBook = new Map<string, { name: string; badgeImageUrl: string | null }[]>();
  for (const row of (earnedBadges ?? []) as BadgeRow[]) {
    const badge = one(row.badges);
    if (!badge) continue;
    const list = badgesByBook.get(row.book_id) ?? [];
    list.push({ name: badge.name, badgeImageUrl: badge.badge_image_url });
    badgesByBook.set(row.book_id, list);
  }

  const books = ((userBooks ?? []) as BookRow[]).map((ub) => {
    const book = one(ub.books);
    return {
      bookId: ub.book_id,
      title: book?.title ?? "Untitled",
      badgesEarnedCount: ub.badges_earned,
      badges: badgesByBook.get(ub.book_id) ?? [],
    };
  });

  return (
    <AppShell>
      <main className="max-w-xl mx-auto px-5 py-8">
        <div className="flex items-center gap-4 mb-10">
          <Avatar
            avatarKey={profile.avatar_key}
            countryCode={profile.country_code}
            avatarColor={profile.avatar_color}
            name={name}
            size={64}
          />
          <h1 className="text-2xl flex items-center gap-1.5">
            {name}
            {verifiedBuyer && <VerifiedBadge />}
          </h1>
        </div>

        {/* Own-profile only (see the isOwnProfile check above): sharing
            your own achievements is fine, but a button that lets anyone
            share a link to someone ELSE's profile without their
            involvement is a different, not-asked-for thing. Placed right
            here, at the top of the content being shared, rather than
            tucked back in Account settings. */}
        {isOwnProfile && (
          <div className="flex justify-center mb-8">
            <ShareButton
              type="profile"
              directUrl={`/u/${params.userId}`}
              directImageUrl={`/api/og/profile/${params.userId}`}
              label="Share my profile"
              shareTitle={`${name} on Still Growing`}
              shareText="Check out my growing tree on Still Growing!"
            />
          </div>
        )}

        {/* Signed-in viewer, someone else's profile: the only entry
            point for this before was reacting to one of their
            reflections in the Circle -- hidden entirely for a signed-out
            visitor (nothing to authenticate the request with) and on
            your own profile (can't root for yourself, enforced again
            server-side and at the DB level). */}
        {user && !isOwnProfile && (
          <div className="flex justify-center mb-8">
            <ProfileRootFor
              targetUserId={params.userId}
              targetName={name}
              initialRooting={!!existingConnection}
            />
          </div>
        )}

        <GrowingTree seed={profile.id} connectionCount={connectionCount} className="w-full max-w-sm mx-auto mb-4" />
        <div className="mb-10">
          {sharedReflectionCount > 0 && (
            <p className="text-center text-sm text-gray-400 italic mb-1">
              {name} has shared {sharedReflectionCount} {sharedReflectionCount === 1 ? "reflection" : "reflections"} in
              the Circle.
            </p>
          )}
          <p className="text-center text-sm text-gray-400 italic mb-2">
            {connectionCount === 0
              ? `No one's rooting for ${name}'s growth yet.`
              : connectionCount === 1
              ? `1 person rooting for ${name}'s growth.`
              : `${connectionCount} people rooting for ${name}'s growth.`}
          </p>
          <GrowingTreeStats extra={growingTreeExtra} />
        </div>

        {pinned.length > 0 && (
          <div className="space-y-3 mb-10">
            <h2 className="text-xs uppercase tracking-widest text-gray-400">Pinned reflections</h2>
            {pinned.map((r) => (
              <div key={r.id} className="bg-white border border-pink-pale rounded-xl2 px-5 py-4">
                <p className="text-sm text-ink leading-relaxed italic">&ldquo;{r.text}&rdquo;</p>
                <p className="text-xs text-gray-300 mt-2">Chapter {r.chapter_number}</p>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-4">
          <h2 className="text-xs uppercase tracking-widest text-gray-400">Books</h2>
          {books.length === 0 ? (
            <p className="text-sm text-gray-400">No books unlocked yet.</p>
          ) : (
            books.map((b) => (
              <div key={b.bookId} className="bg-white border border-pink-pale rounded-xl2 p-5">
                <h3 className="font-display text-plum text-lg mb-1">{b.title}</h3>
                <p className="text-sm text-gray-400 mb-4">
                  {b.badgesEarnedCount} {b.badgesEarnedCount === 1 ? "badge" : "badges"} earned
                </p>
                {b.badges.length > 0 && (
                  <div className="flex flex-wrap gap-4">
                    {b.badges.map((badge, i) => (
                      <div key={i} className="flex flex-col items-center w-16 text-center">
                        {badge.badgeImageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={badge.badgeImageUrl}
                            alt={badge.name}
                            className="w-12 h-12 object-contain"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-pink-pale flex items-center justify-center text-xl">
                            🏅
                          </div>
                        )}
                        <span className="text-[10px] text-gray-400 mt-1 leading-tight">{badge.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Signed-out viewers only (see the promoBook fetch above) --
            below all real profile content, in the same demoted/secondary
            position app/r/[shareId]/page.tsx already uses (BookPromo's
            own top border/padding is that section's divider). */}
        {!user && (
          <div className="mt-16">
            <BookPromo coverImageUrl={promoBook?.cover_image_url ?? null} salesUrl={promoBook?.sales_page_url ?? null} />
          </div>
        )}
      </main>
    </AppShell>
  );
}
