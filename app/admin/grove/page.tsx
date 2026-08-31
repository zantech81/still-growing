import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import GrovePostsList from "@/components/admin/GrovePostsList";

export default async function AdminGrovePage() {
  const supabase = createClient();
  const { data: posts } = await supabase
    .from("grove_posts")
    .select("id, title, status, created_at, published_at")
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-display text-plum">The Grove</h1>
        <Link
          href="/admin/grove/new"
          className="bg-plum text-white px-4 py-2 rounded-xl2 text-sm font-medium hover:opacity-90 transition-opacity"
        >
          + New post
        </Link>
      </div>

      <GrovePostsList initialPosts={posts ?? []} />
    </div>
  );
}
