import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import GrovePostForm from "@/components/admin/GrovePostForm";

export default async function EditGrovePostPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: post } = await supabase
    .from("grove_posts")
    .select("id, title, body, media_url, status")
    .eq("id", params.id)
    .single();

  if (!post) notFound();

  return (
    <div>
      <h1 className="text-3xl font-display text-plum mb-8">Edit Grove post</h1>
      <GrovePostForm post={post} />
    </div>
  );
}
