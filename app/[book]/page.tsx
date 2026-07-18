export const dynamic = "force-dynamic";

import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/AppShell";
import BannerImageExpand from "@/components/BannerImageExpand";
import ShareButton from "@/components/ShareButton";

export default async function JourneyPage({
  params,
}: {
  params: { book: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/${params.book}`);

  const { data: book } = await supabase
    .from("books")
    .select("id, slug, title, subtitle, banner_image_url")
    .eq("slug", params.book)
    .eq("status", "published")
    .single();

  if (!book) notFound();

  const { data: bookUnlock } = await supabase
    .from("book_unlocks")
    .select("id")
    .eq("user_id", user.id)
    .eq("book_id", book.id)
    .maybeSingle();

  if (!bookUnlock) redirect(`/library?next=/${params.book}`);

  const [{ data: chapters }, { data: userBook }, { data: myReflections }] =
    await Promise.all([
      supabase
        .from("chapters")
        .select("id, number, title, milestone_label, badges(id, name, badge_image_url)")
        .eq("book_id", book.id)
        .order("number"),
      supabase
        .from("user_books")
        .select("current_chapter, badges_earned")
        .eq("user_id", user.id)
        .eq("book_id", book.id)
        .maybeSingle(),
      supabase
        .from("reflections")
        .select("hearts_count")
        .eq("book_id", book.id)
        .eq("user_id", user.id),
    ]);

  const currentChapter = userBook?.current_chapter ?? 1;
  const badgesEarned = userBook?.badges_earned ?? 0;
  const totalChapters = chapters?.length ?? 0;
  const allComplete = totalChapters > 0 && badgesEarned >= totalChapters;

  const reflectionCount = myReflections?.length ?? 0;
  const reactionsReceived = (myReflections ?? []).reduce(
    (sum, r) => sum + (r.hearts_count ?? 0),
    0
  );

  const r = 36;
  const circumference = 2 * Math.PI * r;
  const pct = totalChapters > 0 ? Math.min(badgesEarned / totalChapters, 1) : 0;
  const dashOffset = circumference * (1 - pct);

  return (
    <AppShell>
      <main className="max-w-xl mx-auto px-5 py-8">
        <div className="mb-6">
          <Link
            href="/library"
            className="text-sm text-gray-400 hover:text-ink transition-colors"
          >
            ← Library
          </Link>
        </div>

        <h1 className="font-display text-3xl text-plum mb-1">{book.title}</h1>
        {book.subtitle && (
          <p className="text-gray-400 mb-8 italic text-sm">{book.subtitle}</p>
        )}

        {/* Stacked layout: banner → progress card → stats card, full width at all viewport sizes */}
        <div className="mb-8 space-y-4">
          {book.banner_image_url && (
            <BannerImageExpand
              src={book.banner_image_url}
              alt={book.title}
              thumbnailClassName="w-full aspect-[5/4]"
            />
          )}

          {/* Progress card: column layout, ring above text, both centered */}
          <div className="flex flex-col items-center justify-center gap-3 text-center bg-white border border-pink-pale rounded-xl2 p-5">
            <svg
              width="88"
              height="88"
              viewBox="0 0 88 88"
              aria-label={`${badgesEarned} of ${totalChapters} badges earned`}
            >
              <circle cx="44" cy="44" r={r} fill="none" stroke="#F7E1E9" strokeWidth="8" />
              {pct > 0 && (
                <circle
                  cx="44"
                  cy="44"
                  r={r}
                  fill="none"
                  stroke={allComplete ? "#C76A8A" : "#E8A0B8"}
                  strokeWidth="8"
                  strokeDasharray={circumference}
                  strokeDashoffset={dashOffset}
                  strokeLinecap="round"
                  transform="rotate(-90 44 44)"
                />
              )}
              <text x="44" y="42" textAnchor="middle" fontSize="20" fontWeight="600" fill="#3A3A3A" fontFamily="Georgia, serif">
                {badgesEarned}
              </text>
              <text x="44" y="58" textAnchor="middle" fontSize="11" fill="#9CA3AF" fontFamily="system-ui, sans-serif">
                of {totalChapters}
              </text>
            </svg>

            <div>
              <p className="font-display text-xl text-plum leading-snug">
                {badgesEarned === 0
                  ? "Ready to begin"
                  : allComplete
                  ? "Journey complete ✓"
                  : `${badgesEarned} badge${badgesEarned === 1 ? "" : "s"} earned`}
              </p>
              <p className="text-sm text-gray-400 mt-0.5">
                {allComplete
                  ? "All chapters unlocked"
                  : badgesEarned === 0
                  ? "Start with chapter 1"
                  : `${totalChapters - badgesEarned} chapter${
                      totalChapters - badgesEarned === 1 ? "" : "s"
                    } to go`}
              </p>
            </div>

            <ShareButton
              type="progress"
              bookId={book.id}
              label="Share your progress"
              shareTitle="My Still Growing journey"
              shareText={`${badgesEarned} of ${totalChapters} badges earned on my Still Growing journey.`}
              className="text-xs text-pink-deep hover:underline"
            />
          </div>

          {/* Stats card: centered within cell */}
          {reflectionCount > 0 ? (
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-blue-soft rounded-lg px-4 py-3 text-center">
                <p className="font-display text-2xl text-plum leading-none">{reflectionCount}</p>
                <p className="text-xs text-gray-400 mt-1">
                  reflection{reflectionCount === 1 ? "" : "s"}
                </p>
              </div>
              <div className="flex-1 bg-green-soft rounded-lg px-4 py-3 text-center">
                <p className="font-display text-2xl text-plum leading-none">{reactionsReceived}</p>
                <p className="text-xs text-gray-400 mt-1">felt you</p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-400 italic leading-snug text-center">
              Share a reflection after claiming a badge. Your words might land for someone else.
            </p>
          )}
        </div>

        {/* Chapter list */}
        <div className="space-y-2">
          {(chapters ?? []).map((chapter) => {
            type ChapterBadge = { id: string; name: string; badge_image_url: string | null };
            const badgeRaw = chapter.badges as unknown as ChapterBadge | ChapterBadge[] | null;
            const badge = Array.isArray(badgeRaw) ? (badgeRaw[0] ?? null) : badgeRaw;

            const state: "earned" | "available" | "locked" =
              chapter.number < currentChapter
                ? "earned"
                : chapter.number === currentChapter
                ? "available"
                : "locked";
            const href = `/${book.slug}/ch${chapter.number}`;

            const inner = (
              <div
                className={`flex items-start gap-4 p-4 rounded-xl2 transition-colors ${
                  state === "earned"
                    ? "bg-green-soft"
                    : state === "available"
                    ? "bg-pink-pale border border-pink-dusty"
                    : "bg-white border border-gray-100 opacity-50 cursor-default"
                }`}
              >
                {/* Left indicator: always ✓ / → / empty ring */}
                {state === "earned" ? (
                  <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-sm mt-0.5 bg-pink-dusty text-white font-bold">
                    ✓
                  </div>
                ) : state === "available" ? (
                  <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-sm mt-0.5 border-2 border-pink-deep text-pink-deep font-bold">
                    →
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full flex-shrink-0 mt-0.5 border-2 border-gray-200" />
                )}

                <div className="flex-1 min-w-0">
                  {chapter.milestone_label && (
                    <p className="text-xs text-gray-400 mb-0.5 uppercase tracking-wide">
                      {chapter.milestone_label}
                    </p>
                  )}
                  <p className="font-display text-plum leading-snug">{chapter.title}</p>
                  {state === "earned" && badge && (
                    <p className="text-xs text-pink-deep mt-1">{badge.name}</p>
                  )}
                  {state === "available" && (
                    <p className="text-xs text-pink-deep font-medium mt-1">
                      Claim your badge →
                    </p>
                  )}
                </div>

                {/* Right end: badge thumbnail for earned, chapter number otherwise */}
                {state === "earned" && badge?.badge_image_url ? (
                  <img
                    src={badge.badge_image_url}
                    alt={badge.name ?? ""}
                    className="w-12 h-12 flex-shrink-0 object-contain"
                  />
                ) : (
                  <span className="text-xs text-gray-300 flex-shrink-0 mt-1">
                    {chapter.number}
                  </span>
                )}
              </div>
            );

            if (state === "locked") {
              return <div key={chapter.id}>{inner}</div>;
            }

            if (state === "earned") {
              // Not a full-card Link here (unlike "available" below): a
              // share button needs to live in this card without being
              // swallowed by an enclosing anchor's click, so only the
              // content itself is the link and the share action sits
              // beside it as its own element.
              return (
                <div key={chapter.id}>
                  <Link href={href} className="block group">
                    {inner}
                  </Link>
                  {badge && (
                    <div className="pl-16 -mt-1 mb-1">
                      <ShareButton
                        type="badge"
                        bookId={book.id}
                        referenceId={badge.id}
                        label="Share badge"
                        shareTitle={`I earned the ${badge.name}!`}
                        shareText={`I just earned the ${badge.name} on my Still Growing journey.`}
                        className="text-xs text-pink-deep hover:underline"
                      />
                    </div>
                  )}
                </div>
              );
            }

            return (
              <Link key={chapter.id} href={href} className="block group">
                {inner}
              </Link>
            );
          })}
        </div>
      </main>
    </AppShell>
  );
}
