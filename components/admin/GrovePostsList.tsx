"use client";

import Link from "next/link";
import { useState } from "react";
import { deleteGrovePost } from "@/lib/grove";

type Post = {
  id: string;
  title: string;
  status: string;
  created_at: string;
  published_at: string | null;
};

const STATUS_BADGE: Record<string, string> = {
  draft: "bg-gray-100 text-gray-500",
  published: "bg-green-soft text-plum",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// Client component so a delete can remove the row in place rather than
// forcing a full page reload -- same reasoning as MembersList.tsx, but a
// single plain confirm step rather than that component's type-DELETE
// pattern: a Grove post is content, not an account with personal data
// cascading off it, so that much friction isn't proportionate here.
export default function GrovePostsList({ initialPosts }: { initialPosts: Post[] }) {
  const [posts, setPosts] = useState(initialPosts);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<{ id: string; message: string } | null>(null);

  async function handleDelete(id: string) {
    setProcessingId(id);
    setRowError(null);
    const { error } = await deleteGrovePost(id);
    setProcessingId(null);
    if (error) {
      setRowError({ id, message: error });
      return;
    }
    setPosts((prev) => prev.filter((p) => p.id !== id));
    setConfirmingId(null);
  }

  if (!posts.length) {
    return <p className="text-sm text-gray-400">No posts yet. Create your first one.</p>;
  }

  return (
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
            {rowError?.id === post.id && <p className="text-xs text-pink-deep mt-1">{rowError.message}</p>}
          </div>

          {confirmingId === post.id ? (
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-xs text-gray-500">Delete this post?</span>
              <button
                onClick={() => handleDelete(post.id)}
                disabled={processingId === post.id}
                className="text-xs px-2.5 py-1 rounded-lg bg-pink-deep text-white hover:bg-plum transition-colors disabled:opacity-50"
              >
                {processingId === post.id ? "…" : "Confirm"}
              </button>
              <button
                onClick={() => setConfirmingId(null)}
                disabled={processingId === post.id}
                className="text-xs px-2.5 py-1 text-gray-400 hover:text-ink transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3 flex-shrink-0">
              <Link href={`/admin/grove/${post.id}`} className="text-sm text-pink-deep hover:underline">
                Edit
              </Link>
              <button
                onClick={() => setConfirmingId(post.id)}
                className="text-xs px-2.5 py-1 rounded-lg border border-pink-deep text-pink-deep hover:bg-pink-pale transition-colors"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
