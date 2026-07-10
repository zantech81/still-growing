import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ChapterForm from "@/components/admin/ChapterForm";

export default async function NewChapterPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: book } = await supabase
    .from("books")
    .select("id, title, slug")
    .eq("id", params.id)
    .single();

  if (!book) notFound();

  return (
    <div>
      <h1 className="text-3xl font-display text-plum mb-2">New chapter</h1>
      <p className="text-sm text-gray-400 mb-8">{book.title}</p>
      <ChapterForm bookId={params.id} />
    </div>
  );
}
