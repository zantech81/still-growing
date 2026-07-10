import { createClient } from "@/lib/supabase/server";
import BookForm from "@/components/admin/BookForm";

export default async function NewBookPage() {
  const supabase = createClient();
  const { data: collections } = await supabase
    .from("collections")
    .select("id, name")
    .order("name");

  return (
    <div>
      <h1 className="text-3xl font-display text-plum mb-8">New book</h1>
      <BookForm collections={collections ?? []} />
    </div>
  );
}
