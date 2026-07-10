import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import NavBar from "@/components/NavBar";

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
    .select("id, slug, title, subtitle")
    .eq("slug", params.book)
    .eq("status", "published")
    .single();

  if (!book) notFound();

  // Access control: reader must have entered the redemption code
  const { data: bookUnlock } = await supabase
    .from("book_unlocks")
    .select("id")
    .eq("user_id", user.id)
    .eq("book_id", book.id)
    .maybeSingle();

  if (!bookUnlock) redirect("/library");

  const [{ data: chapters }, { data: userBook }] = await Promise.all([
    supabase
      .from("chapters")
      .select("id, number, title, milestone_label, badges(id, name)")
      .eq("book_id", book.id)
      .order("number"),
    supabase
      .from("user_books")
      .select("current_chapter, badges_earned")
      .eq("user_id", user.id)
      .eq("book_id", book.id)
      .maybeSingle(),
  ]);

  const currentChapter = userBook?.current_chapter ?? 1;
  const badgesEarned = userBook?.badges_earned ?? 0;
  const totalChapters = chapters?.length ?? 0;
  const allComplete = totalChapters > 0 && badgesEarned >= totalChapters;

  // SVG ring geometry
  const r = 36;
  const circumference = 2 * Math.PI * r;
  const pct = totalChapters > 0 ? Math.min(badgesEarned / totalChapters, 1) : 0;
  const dashOffset = circumference * (1 - pct);

  return (
    <>
      <NavBar />
      <main className="max-w-xl mx-auto px-6 py-12">
        <div className="mb-8">
          <Link
            href="/library"
            className="text-sm text-gray-400 hover:text-ink transition-colors"
          >
            ← Library
          </Link>
        </div>

        <h1 className="font-display text-3xl text-plum mb-1">{book.title}</h1>
        {book.subtitle && (
          <p className="text-gray-400 mb-10 italic">{book.subtitle}</p>
        )}

        {/* Progress ring */}
        <div className="flex items-center gap-6 mb-10">
          <svg
            width="88"
            height="88"
            viewBox="0 0 88 88"
            aria-label={`${badgesEarned} of ${totalChapters} badges earned`}
          >
            <circle
              cx="44"
              cy="44"
              r={r}
              fill="none"
              stroke="#F7E1E9"
              strokeWidth="8"
            />
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
            <text
              x="44"
              y="42"
              textAnchor="middle"
              fontSize="20"
              fontWeight="600"
              fill="#3A3A3A"
              fontFamily="Georgia, serif"
            >
              {badgesEarned}
            </text>
            <text
              x="44"
              y="58"
              textAnchor="middle"
              fontSize="11"
              fill="#9CA3AF"
              fontFamily="system-ui, sans-serif"
            >
              of {totalChapters}
            </text>
          </svg>

          <div>
            <p className="font-display text-xl text-plum">
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
        </div>

        {/* Chapter list */}
        <div className="space-y-2">
          {(chapters ?? []).map((chapter) => {
            const badge = chapter.badges as unknown as { id: string; name: string } | null;
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
                    ? "bg-green-soft group-hover:border-green-200"
                    : state === "available"
                    ? "bg-pink-pale border border-pink-dusty"
                    : "bg-white border border-gray-100 opacity-50 cursor-default"
                }`}
              >
                {/* State indicator */}
                {state === "earned" && (
                  <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-sm mt-0.5 bg-pink-dusty text-white font-bold">
                    ✓
                  </div>
                )}
                {state === "available" && (
                  <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-sm mt-0.5 border-2 border-pink-deep text-pink-deep font-bold">
                    →
                  </div>
                )}
                {state === "locked" && (
                  <div className="w-8 h-8 rounded-full flex-shrink-0 mt-0.5 border-2 border-gray-200" />
                )}

                {/* Chapter info */}
                <div className="flex-1 min-w-0">
                  {chapter.milestone_label && (
                    <p className="text-xs text-gray-400 mb-0.5 uppercase tracking-wide">
                      {chapter.milestone_label}
                    </p>
                  )}
                  <p className="font-display text-plum leading-snug">
                    {chapter.title}
                  </p>
                  {state === "earned" && badge && (
                    <p className="text-xs text-pink-deep mt-1">{badge.name}</p>
                  )}
                  {state === "available" && (
                    <p className="text-xs text-pink-deep font-medium mt-1">
                      Claim your badge →
                    </p>
                  )}
                </div>

                <span className="text-xs text-gray-300 flex-shrink-0 mt-1">
                  {chapter.number}
                </span>
              </div>
            );

            if (state === "locked") {
              return <div key={chapter.id}>{inner}</div>;
            }
            return (
              <Link key={chapter.id} href={href} className="block group">
                {inner}
              </Link>
            );
          })}
        </div>
      </main>
    </>
  );
}
