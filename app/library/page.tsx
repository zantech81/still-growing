import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/AppShell";
import LockedBookCard from "@/components/LockedBookCard";
import { DEFAULT_PLACEHOLDER_TEXT } from "@/lib/comingSoonPlaceholders";

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: { next?: string | string[] };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/library");

  const [{ data: collections }, { data: books }, { data: userBooks }, { data: bookUnlocks }] =
    await Promise.all([
      supabase
        .from("collections")
        .select("id, name, description, sort_order, status")
        .in("status", ["published", "coming_soon"])
        .order("sort_order"),
      supabase
        .from("books")
        .select("id, slug, title, subtitle, description, cover_image_url, sort_order, collection_id, status, reveal_details, placeholder_text, chapters(id)")
        .in("status", ["published", "coming_soon"])
        .order("sort_order"),
      supabase
        .from("user_books")
        .select("book_id, badges_earned, current_chapter")
        .eq("user_id", user.id),
      supabase
        .from("book_unlocks")
        .select("book_id")
        .eq("user_id", user.id),
    ]);

  const progressMap = Object.fromEntries(
    (userBooks ?? []).map((ub) => [ub.book_id, ub])
  );
  const unlockedSet = new Set((bookUnlocks ?? []).map((bu) => bu.book_id));

  // Preserve deep-link destination through the unlock form
  const nextUrl = Array.isArray(searchParams.next)
    ? searchParams.next[0]
    : (searchParams.next ?? null);
  const nextBookSlug = nextUrl?.startsWith("/") ? nextUrl.split("/")[1] ?? null : null;

  // Show collections that have at least one published or coming_soon book
  const collectionList = (collections ?? [])
    .map((col) => ({
      ...col,
      books: (books ?? []).filter((b) => b.collection_id === col.id),
    }))
    .filter((col) => col.books.length > 0);

  return (
    <AppShell>
      <main className="max-w-xl mx-auto px-5 py-8">
        <h1 className="text-3xl mb-0.5">Your Library</h1>
        <p className="text-gray-400 mb-10 italic text-sm">Your journey, your pace.</p>

        {collectionList.length === 0 ? (
          <p className="text-gray-500 text-center py-16">
            No books are available yet. Check back soon.
          </p>
        ) : (
          <div className="space-y-12">
            {collectionList.map((collection) => (
              <section key={collection.id}>
                {/* Collection header */}
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-sm font-semibold uppercase tracking-widest text-pink-deep">
                    {collection.name}
                  </h2>
                  {collection.status === "coming_soon" ? (
                    <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-blue-soft text-blue-500">
                      Coming soon
                    </span>
                  ) : (
                    <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-green-soft text-green-700">
                      Available now
                    </span>
                  )}
                </div>

                <div className="space-y-3">
                  {collection.books.map((book) => {
                    // Teaser card: book isn't open yet, just building anticipation
                    if (book.status === "coming_soon") {
                      return (
                        <div
                          key={book.id}
                          className="relative flex gap-4 bg-white border border-gray-100 rounded-xl2 p-4 opacity-60 select-none"
                        >
                          {/* Cover placeholder */}
                          <div
                            className="w-[50px] aspect-[5/8] rounded-lg flex-shrink-0 flex items-center justify-center text-xl"
                            style={{ background: "linear-gradient(145deg, #F7E1E9, #E6F1FB)", filter: "grayscale(0.4)" }}
                          >
                            📖
                          </div>
                          <div className="flex-1 min-w-0 pr-24">
                            {book.reveal_details ? (
                              <>
                                <h3 className="font-display text-plum text-[1.05rem] leading-snug mb-0.5">
                                  {book.title}
                                </h3>
                                {(book.subtitle ?? book.description) && (
                                  <p className="text-xs text-gray-400 leading-snug">
                                    {book.subtitle ?? book.description}
                                  </p>
                                )}
                              </>
                            ) : (
                              <h3 className="font-display text-plum text-[1.05rem] leading-snug mb-0.5 italic">
                                {book.placeholder_text ?? DEFAULT_PLACEHOLDER_TEXT}
                              </h3>
                            )}
                          </div>
                          <span className="absolute top-3 right-3 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-soft text-blue-500 leading-none">
                            Coming soon
                          </span>
                        </div>
                      );
                    }

                    const isUnlocked = unlockedSet.has(book.id);
                    const progress = progressMap[book.id];
                    const totalChapters = (book.chapters as { id: string }[]).length;
                    const badgesEarned = progress?.badges_earned ?? 0;
                    const started = !!progress;
                    const pct = totalChapters > 0 ? (badgesEarned / totalChapters) * 100 : 0;
                    const allComplete = totalChapters > 0 && badgesEarned >= totalChapters;

                    if (!isUnlocked) {
                      return (
                        <LockedBookCard
                          key={book.id}
                          bookId={book.id}
                          title={book.title}
                          subtitle={book.subtitle ?? null}
                          coverImageUrl={book.cover_image_url ?? null}
                          nextUrl={book.slug === nextBookSlug ? nextUrl : null}
                        />
                      );
                    }

                    return (
                      <Link
                        key={book.id}
                        href={`/${book.slug}`}
                        className="relative flex gap-4 bg-white border border-pink-pale hover:border-pink-dusty rounded-xl2 p-4 transition-colors group"
                      >
                        {/* Cover */}
                        {book.cover_image_url ? (
                          <img
                            src={book.cover_image_url}
                            alt={book.title}
                            className="w-[50px] aspect-[5/8] min-w-[50px] object-cover rounded-lg flex-shrink-0 self-start"
                          />
                        ) : (
                          <div
                            className="w-[50px] aspect-[5/8] rounded-lg flex-shrink-0 flex items-center justify-center text-xl select-none"
                            style={{ background: "linear-gradient(145deg, #F7E1E9, #E6F1FB)" }}
                          >
                            📖
                          </div>
                        )}

                        {/* Info: pr-12 leaves room for the progress badge */}
                        <div className="flex-1 min-w-0 pr-10">
                          <h3 className="font-display text-plum text-[1.05rem] leading-snug mb-0.5">
                            {book.title}
                          </h3>
                          {book.subtitle && (
                            <p className="text-xs text-gray-400 leading-snug mb-2.5">
                              {book.subtitle}
                            </p>
                          )}

                          {started ? (
                            <>
                              <div className="h-1.5 bg-pink-pale rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all"
                                  style={{ background: "#E5B94E", width: `${pct}%` }}
                                />
                              </div>
                              {allComplete && (
                                <p className="text-xs text-pink-deep font-medium mt-1.5">
                                  Journey complete ✓
                                </p>
                              )}
                            </>
                          ) : (
                            <span className="text-xs text-pink-deep group-hover:underline">
                              Begin your journey →
                            </span>
                          )}
                        </div>

                        {/* Progress badge (top-right corner), only when started */}
                        {started && (
                          <span
                            className="absolute top-3 right-3 text-[11px] font-bold text-white px-2 py-0.5 rounded-full leading-none"
                            style={{ background: "linear-gradient(135deg, #E5B94E, #FBBF24)" }}
                          >
                            {badgesEarned}/{totalChapters}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
    </AppShell>
  );
}
