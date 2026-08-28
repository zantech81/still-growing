import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const STATUS_BADGE: Record<string, string> = {
  draft: "bg-gray-100 text-gray-500",
  published: "bg-green-soft text-plum",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

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

      {!posts?.length ? (
        <p className="text-sm text-gray-400">No posts yet. Create your first one.</p>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <div
              key={post.id}
              className="bg-white border border-pink-pale rounded-xl2 px-5 py-4 flex items-center gap-4"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="font-medium text-plum truncate">{post.title}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[post.status]}`}>
                    {post.status === "published" ? "Published" : "Draft"}
                  </span>
                </div>
                <p className="text-xs text-gray-400">
                  {post.status === "published" && post.published_at
                    ? `Published ${formatDate(post.published_at)}`
                    : `Created ${formatDate(post.created_at)}`}
                </p>
              </div>
              <Link
                href={`/admin/grove/${post.id}`}
                className="text-sm text-pink-deep hover:underline flex-shrink-0"
              >
                Edit
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
