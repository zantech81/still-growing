import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ClaimChapter from "@/components/ClaimChapter";

// Handles stillgrowing.co/baby/ch4 — the exact URL printed in each chapter's
// Milestone box in the book. middleware.ts has already ensured the reader is
// logged in by the time they reach this page. Clicking the link never
// auto-claims anything: the reflection is still a deliberate action here.
export default async function ChapterPage({
  params,
}: {
  params: { book: string; chapter: string };
}) {
  const match = params.chapter.match(/^ch(\d+)$/);
  if (!match) notFound();
  const chapterNumber = parseInt(match[1], 10);

  const supabase = createClient();

  const { data: book } = await supabase
    .from("books")
    .select("id, title, slug")
    .eq("slug", params.book)
    .eq("status", "published")
    .single();

  if (!book) notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Access control: reader must have entered the redemption code for this book
  const { data: bookUnlock } = await supabase
    .from("book_unlocks")
    .select("id")
    .eq("user_id", user!.id)
    .eq("book_id", book.id)
    .maybeSingle();

  if (!bookUnlock) redirect("/library");

  const { data: chapter } = await supabase
    .from("chapters")
    .select("id, number, title, milestone_label, reflect_question, mux_playback_id, badges(id, name, icon, description)")
    .eq("book_id", book.id)
    .eq("number", chapterNumber)
    .single();

  if (!chapter) notFound();

  const { data: userBook } = await supabase
    .from("user_books")
    .select("current_chapter")
    .eq("user_id", user!.id)
    .eq("book_id", book.id)
    .maybeSingle();

  const { data: existingBadge } = await supabase
    .from("user_badges")
    .select("id")
    .eq("user_id", user!.id)
    .eq("badge_id", (chapter.badges as any)?.id)
    .maybeSingle();

  // Sequential unlock: don't allow claiming ahead of where they've reached.
  const currentChapter = userBook?.current_chapter ?? 1;
  const isLocked = chapterNumber > currentChapter;

  return (
    <ClaimChapter
      book={book}
      chapter={chapter}
      alreadyClaimed={!!existingBadge}
      isLocked={isLocked}
    />
  );
}
