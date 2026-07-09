import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import NavBar from "@/components/NavBar";

export default async function LibraryPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/library");

  const [{ data: collections }, { data: books }, { data: userBooks }] = await Promise.all([
    supabase
      .from("collections")
      .select("id, name, description, sort_order")
      .eq("status", "published")
      .order("sort_order"),
    supabase
      .from("books")
      .select("id, slug, title, subtitle, cover_image_url, sort_order, collection_id, chapters(id)")
      .eq("status", "published")
      .order("sort_order"),
    supabase
      .from("user_books")
      .select("book_id, badges_earned, current_chapter")
      .eq("user_id", user.id),
  ]);

  const progressMap = Object.fromEntries(
    (userBooks ?? []).map((ub) => [ub.book_id, ub])
  );

  // Only show collections that have at least one published book
  const collectionList = (collections ?? [])
    .map((col) => ({
      ...col,
      books: (books ?? []).filter((b) => b.collection_id === col.id),
    }))
    .filter((col) => col.books.length > 0);

  return (
    <>
      <NavBar />
      <main className="max-w-2xl mx-auto px-6 py-12">
        <h1 className="text-4xl mb-1">Your Library</h1>
        <p className="text-gray-400 mb-12 italic">Your journey, your pace.</p>

        {collectionList.length === 0 ? (
          <p className="text-gray-500 text-center py-16">
            No books are available yet. Check back soon.
          </p>
        ) : (
          <div className="space-y-14">
            {collectionList.map((collection) => (
              <section key={collection.id}>
                <h2 className="text-sm font-medium uppercase tracking-widest text-pink-deep mb-6">
                  {collection.name}
                </h2>
                <div className="space-y-4">
                  {collection.books.map((book) => {
                    const progress = progressMap[book.id];
                    const totalChapters = (book.chapters as { id: string }[]).length;
                    const badgesEarned = progress?.badges_earned ?? 0;
                    const started = !!progress;
                    const pct = totalChapters > 0 ? (badgesEarned / totalChapters) * 100 : 0;

                    return (
                      <Link
                        key={book.id}
                        href={`/${book.slug}`}
                        className="flex gap-5 bg-white border border-pink-pale hover:border-pink-dusty rounded-xl2 p-5 transition-colors"
                      >
                        {/* Cover */}
                        {book.cover_image_url ? (
                          <img
                            src={book.cover_image_url}
                            alt={book.title}
                            className="w-16 h-20 object-cover rounded-lg flex-shrink-0"
                          />
                        ) : (
                          <div className="w-16 h-20 bg-pink-pale rounded-lg flex-shrink-0 flex items-center justify-center text-2xl select-none">
                            📖
                          </div>
                        )}

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-xl leading-snug mb-0.5">{book.title}</h3>
                          {book.subtitle && (
                            <p className="text-sm text-gray-400 mb-3 leading-snug">
                              {book.subtitle}
                            </p>
                          )}

                          {started ? (
                            <div>
                              <div className="flex justify-between text-xs text-gray-400 mb-1.5">
                                <span>
                                  {badgesEarned} of {totalChapters} badges
                                </span>
                                {badgesEarned === totalChapters && (
                                  <span className="text-pink-deep font-medium">Complete ✓</span>
                                )}
                              </div>
                              <div className="h-1.5 bg-pink-pale rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-pink-dusty rounded-full"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          ) : (
                            <span className="text-sm text-pink-deep">Begin your journey →</span>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
