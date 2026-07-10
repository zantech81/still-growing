import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import NavBar from "@/components/NavBar";
import CircleFeed, { type ReflectionRow, type ChapterRow } from "@/components/CircleFeed";

type UserBookJoin = {
  book_id: string;
  current_chapter: number;
  books: { id: string; slug: string; title: string };
};

export default async function CirclePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/circle");

  // Books the user has started (one for Phase 1, but query is multi-book ready)
  const { data: rawUserBooks } = await supabase
    .from("user_books")
    .select("book_id, current_chapter, books(id, slug, title)")
    .eq("user_id", user.id);

  const userBooks = (rawUserBooks ?? []) as unknown as UserBookJoin[];

  if (userBooks.length === 0) {
    return (
      <>
        <NavBar />
        <main className="max-w-xl mx-auto px-6 py-24 text-center">
          <h1 className="font-display text-3xl text-plum mb-4">The Circle</h1>
          <p className="text-gray-400 mb-6">
            Your journey unlocks the Circle. Start with a book in your Library.
          </p>
          <Link
            href="/library"
            className="text-pink-deep hover:text-plum transition-colors"
          >
            Go to Library →
          </Link>
        </main>
      </>
    );
  }

  // Use first started book; a book selector can be added when there are multiple books
  const { books: book, current_chapter: currentChapter } = userBooks[0];

  // Parallel: spoiler-safe reflections + chapters the user has reached
  const [{ data: rawReflections }, { data: rawChapters }] = await Promise.all([
    supabase
      .from("reflections")
      .select(
        "id, text, chapter_number, hearts_count, created_at, users(display_name, avatar_color, country_code)"
      )
      .eq("book_id", book.id)
      .lte("chapter_number", currentChapter)
      .eq("is_hidden", false)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("chapters")
      .select("number, title, milestone_label")
      .eq("book_id", book.id)
      .lte("number", currentChapter)
      .order("number"),
  ]);

  const reflections = (rawReflections ?? []) as unknown as ReflectionRow[];
  const chapters = (rawChapters ?? []) as unknown as ChapterRow[];

  // Which of these reflections has the current user already reacted to?
  const reflectionIds = reflections.map((r) => r.id);
  let myReactionIds: string[] = [];
  if (reflectionIds.length > 0) {
    const { data: myReactions } = await supabase
      .from("reactions")
      .select("reflection_id")
      .eq("user_id", user.id)
      .in("reflection_id", reflectionIds);
    myReactionIds = (myReactions ?? []).map(
      (r) => r.reflection_id as string
    );
  }

  return (
    <>
      <NavBar />
      <main className="max-w-xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-4xl mb-1">The Circle</h1>
          <p className="text-gray-400 italic">{book.title}</p>
        </div>

        <CircleFeed
          reflections={reflections}
          myReactionIds={myReactionIds}
          chapters={chapters}
          currentUserId={user.id}
        />
      </main>
    </>
  );
}
