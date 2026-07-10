import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BookForm from "@/components/admin/BookForm";

export default async function EditBookPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const [{ data: book }, { data: collections }] = await Promise.all([
    supabase
      .from("books")
      .select("id, collection_id, title, subtitle, description, slug, cover_image_url, redemption_code, status")
      .eq("id", params.id)
      .single(),
    supabase.from("collections").select("id, name").order("name"),
  ]);

  if (!book) notFound();

  return (
    <div>
      <h1 className="text-3xl font-display text-plum mb-2">Edit book</h1>
      <p className="text-sm text-gray-400 mb-8">/{book.slug}</p>
      <BookForm collections={collections ?? []} book={book} />
    </div>
  );
}
