export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/AppShell";
import CircleFeed, { type ReflectionRow, type ChapterRow } from "@/components/CircleFeed";

type GamConfig = { reflection?: { max_length?: number } };

type BookUnlockJoin = {
  book_id: string;
  books: { id: string; slug: string; title: string; gamification_config: GamConfig | null };
};

export default async function CirclePage({
  searchParams,
}: {
  searchParams: { book?: string | string[] };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/circle");

  // No .limit(1) here anymore: need the full list to know whether a
  // switcher is even necessary. With exactly one unlocked book (today's
  // reality) this still resolves to that same single row either way, so
  // nothing changes for any current user.
  const { data: rawUnlocks } = await supabase
    .from("book_unlocks")
    .select("book_id, books(id, slug, title, gamification_config)")
    .eq("user_id", user.id);

  const unlocks = (rawUnlocks ?? []) as unknown as BookUnlockJoin[];

  if (unlocks.length === 0) {
    return (
      <AppShell>
        <main className="max-w-xl mx-auto px-5 py-16 text-center">
          <h1 className="text-3xl mb-3">The Circle</h1>
          <p className="text-gray-400 mb-6 italic text-sm">
            The Circle opens once you have entered your book access code. Find it in your Library.
          </p>
          <Link href="/library" className="text-sm text-pink-deep hover:text-plum transition-colors">
            Go to Library →
          </Link>
        </main>
      </AppShell>
    );
  }

  const requestedSlug = Array.isArray(searchParams?.book) ? searchParams.book[0] : searchParams?.book;
  let selected = requestedSlug ? unlocks.find((u) => u.books.slug === requestedSlug) : undefined;
  // Only auto-select when there's genuinely nothing to choose between --
  // exactly the same single book this page always showed before the
  // switcher existed. With 2+ unlocked books and no (valid) ?book=
  // param, fall through to the switcher below instead of silently
  // picking one, which is what this route did before (arbitrary
  // first-row selection with no way to reach the others).
  if (!selected && unlocks.length === 1) {
    selected = unlocks[0];
  }

  if (!selected) {
    return (
      <AppShell>
        <main className="max-w-xl mx-auto px-5 py-8">
          <h1 className="text-3xl mb-0.5">Choose a Circle</h1>
          <p className="text-gray-400 mb-8 italic text-sm">Pick which book's Circle to open.</p>

          <div className="space-y-3">
            {unlocks.map((u) => (
              <Link
                key={u.books.slug}
                href={`/circle?book=${u.books.slug}`}
                className="flex items-center gap-3 bg-white border border-pink-pale hover:border-pink-dusty rounded-xl2 p-4 transition-colors"
              >
                <h3 className="font-display text-plum text-[1.05rem]">{u.books.title}</h3>
              </Link>
            ))}
          </div>
        </main>
      </AppShell>
    );
  }

  const { books: book } = selected;
  const maxLength = book.gamification_config?.reflection?.max_length ?? 350;

  const { data: userBook } = await supabase
    .from("user_books")
    .select("current_chapter")
    .eq("user_id", user.id)
    .eq("book_id", book.id)
    .maybeSingle();

  const currentChapter = userBook?.current_chapter ?? 1;

  const [{ data: rawReflections }, { data: rawChapters }] = await Promise.all([
    supabase
      .from("reflections")
      .select(
        "id, user_id, text, chapter_number, hearts_count, edit_count, allow_external_share, created_at, users(nickname, display_name, avatar_color, country_code)"
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

  const reflectionIds = reflections.map((r) => r.id);
  let myReactionIds: string[] = [];
  let myReportedIds: string[] = [];
  if (reflectionIds.length > 0) {
    const [{ data: myReactions }, { data: myReports }] = await Promise.all([
      supabase
        .from("reactions")
        .select("reflection_id")
        .eq("user_id", user.id)
        .in("reflection_id", reflectionIds),
      supabase
        .from("content_reports")
        .select("reflection_id")
        .eq("reporter_id", user.id)
        .in("reflection_id", reflectionIds),
    ]);
    myReactionIds = (myReactions ?? []).map((r) => r.reflection_id as string);
    myReportedIds = (myReports ?? []).map((r) => r.reflection_id as string);
  }

  // Person-level, not per-reflection (see supabase/migrations/0029_connections.sql),
  // so this is fetched once as a flat list of author ids, not scoped to reflectionIds.
  const { data: myConnections } = await supabase
    .from("connections")
    .select("rooted_for_id")
    .eq("rooter_id", user.id);
  const myRootedForIds = (myConnections ?? []).map((c) => c.rooted_for_id as string);

  return (
    <AppShell>
      <main className="max-w-xl mx-auto px-5 py-8">
        <div className="mb-8">
          <h1 className="text-3xl mb-0.5">The Circle</h1>
          <p className="text-gray-400 italic text-sm">{book.title}</p>
        </div>

        <CircleFeed
          reflections={reflections}
          myReactionIds={myReactionIds}
          myReportedIds={myReportedIds}
          myRootedForIds={myRootedForIds}
          chapters={chapters}
          currentUserId={user.id}
          maxLength={maxLength}
          bookId={book.id}
        />
      </main>
    </AppShell>
  );
}
