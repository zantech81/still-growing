import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/supabase/isAdmin";
import ChapterForm from "@/components/admin/ChapterForm";

export default async function EditChapterPage({
  params,
}: {
  params: { id: string; chapterId: string };
}) {
  const supabase = createClient();
  if (!(await isAdmin(supabase))) notFound();

  // Service role for the chapter row: unlock_code isn't readable by
  // anon/authenticated (0068_lock_down_codes_and_progress.sql).
  const [{ data: chapter }, { data: badge }, { data: book }] = await Promise.all([
    createAdminClient()
      .from("chapters")
      .select("id, number, title, milestone_label, reflect_question, challenge_text, mux_playback_id, thumbnail_time, unlock_code")
      .eq("id", params.chapterId)
      .eq("book_id", params.id)
      .single(),
    supabase
      .from("badges")
      .select("id, name, icon, description, badge_image_url")
      .eq("chapter_id", params.chapterId)
      .maybeSingle(),
    supabase.from("books").select("id, title").eq("id", params.id).single(),
  ]);

  if (!chapter || !book) notFound();

  return (
    <div>
      <h1 className="text-3xl font-display text-plum mb-2">
        Ch. {chapter.number}: {chapter.title}
      </h1>
      <p className="text-sm text-gray-400 mb-8">{book.title}</p>
      <ChapterForm bookId={params.id} chapter={chapter} badge={badge} />
    </div>
  );
}
