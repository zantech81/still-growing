import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CollectionForm from "@/components/admin/CollectionForm";

export default async function EditCollectionPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: collection } = await supabase
    .from("collections")
    .select("id, name, description, sort_order, status")
    .eq("id", params.id)
    .single();

  if (!collection) notFound();

  return (
    <div>
      <h1 className="text-3xl font-display text-plum mb-8">Edit collection</h1>
      <CollectionForm collection={collection} />
    </div>
  );
}
