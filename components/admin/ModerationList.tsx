"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Reflection = {
  id: string;
  content: string;
  is_hidden: boolean;
  created_at: string;
  users: { display_name: string | null; email: string | null } | null;
  chapters: {
    number: number;
    title: string;
    books: { title: string } | null;
  } | null;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function ModerationList({ reflections }: { reflections: Reflection[] }) {
  const [items, setItems] = useState(reflections);
  const [toggling, setToggling] = useState<string | null>(null);

  async function toggleHidden(id: string, current: boolean) {
    setToggling(id);
    const supabase = createClient();
    const { error } = await supabase
      .from("reflections")
      .update({ is_hidden: !current })
      .eq("id", id);

    if (!error) {
      setItems((prev) =>
        prev.map((r) => (r.id === id ? { ...r, is_hidden: !current } : r))
      );
    }
    setToggling(null);
  }

  if (!items.length) {
    return <p className="text-sm text-gray-400">No reflections yet.</p>;
  }

  return (
    <div className="space-y-3">
      {items.map((r) => {
        const user = r.users as unknown as { display_name: string | null; email: string | null } | null;
        const chapter = r.chapters as unknown as {
          number: number;
          title: string;
          books: { title: string } | null;
        } | null;

        return (
          <div
            key={r.id}
            className={`bg-white border rounded-xl2 px-5 py-4 transition-opacity ${
              r.is_hidden ? "opacity-50 border-gray-200" : "border-pink-pale"
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-400 mb-2">
                  <span className="font-medium text-plum">
                    {user?.display_name ?? user?.email ?? "Unknown"}
                  </span>
                  {chapter && (
                    <>
                      {" · "}
                      {chapter.books?.title} · Ch. {chapter.number} — {chapter.title}
                    </>
                  )}
                  {" · "}
                  {formatDate(r.created_at)}
                  {r.is_hidden && (
                    <span className="ml-2 bg-gray-100 text-gray-500 text-xs px-1.5 py-0.5 rounded-full">
                      Hidden
                    </span>
                  )}
                </p>
                <p className="text-sm text-ink leading-relaxed line-clamp-4">{r.content}</p>
              </div>
              <button
                onClick={() => toggleHidden(r.id, r.is_hidden)}
                disabled={toggling === r.id}
                className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-50 ${
                  r.is_hidden
                    ? "border-pink-dusty text-pink-deep hover:bg-pink-pale"
                    : "border-gray-200 text-gray-400 hover:text-ink hover:border-gray-300"
                }`}
              >
                {toggling === r.id ? "…" : r.is_hidden ? "Unhide" : "Hide"}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
