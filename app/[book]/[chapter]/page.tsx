import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ClaimChapter from "@/components/ClaimChapter";

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
    .select("id, title, slug, gamification_config")
    .eq("slug", params.book)
    .eq("status", "published")
    .single();

  if (!book) notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: bookUnlock } = await supabase
    .from("book_unlocks")
    .select("id")
    .eq("user_id", user!.id)
    .eq("book_id", book.id)
    .maybeSingle();

  if (!bookUnlock) redirect(`/library?next=/${params.book}/${params.chapter}`);

  const { data: chapter } = await supabase
    .from("chapters")
    .select("id, number, title, milestone_label, reflect_question, mux_playback_id, unlock_code, badges(id, name, icon, description, badge_image_url)")
    .eq("book_id", book.id)
    .eq("number", chapterNumber)
    .single();

  if (!chapter) notFound();

  // Supabase returns 1:M joins as arrays even when cardinality is 1.
  type Badge = { id: string; name: string; icon: string | null; description: string | null; badge_image_url: string | null };
  const badgeArr = chapter.badges as unknown as Badge[];
  const badge = Array.isArray(badgeArr) ? (badgeArr[0] ?? null) : (badgeArr as Badge | null);

  // Never send the actual code to the client (same principle as the book
  // redemption code in /api/redeem) - only whether one is required.
  const { unlock_code, badges: _badges, ...chapterFields } = chapter;
  const hasUnlockCode = !!unlock_code;

  const { data: userBook } = await supabase
    .from("user_books")
    .select("current_chapter")
    .eq("user_id", user!.id)
    .eq("book_id", book.id)
    .maybeSingle();

  const [{ data: existingBadge }, { data: pastReflections }] = await Promise.all([
    supabase
      .from("user_badges")
      .select("id")
      .eq("user_id", user!.id)
      .eq("badge_id", badge?.id ?? "")
      .maybeSingle(),
    supabase
      .from("reflections")
      .select("id, text, is_hidden, flag_reason, edit_count, hearts_count, created_at")
      .eq("chapter_id", chapter.id)
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false }),
  ]);

  const currentChapter = userBook?.current_chapter ?? 1;
  const isLocked = chapterNumber > currentChapter;

  type GamConfig = { reflection?: { max_length?: number } };
  const maxLength: number =
    ((book.gamification_config as GamConfig | null)?.reflection?.max_length) ?? 350;

  return (
    <ClaimChapter
      book={book}
      chapter={{ ...chapterFields, badge, hasUnlockCode }}
      alreadyClaimed={!!existingBadge}
      isLocked={isLocked}
      pastReflections={pastReflections ?? []}
      userId={user!.id}
      maxLength={maxLength}
    />
  );
}
