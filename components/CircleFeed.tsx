"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { codeToFlag } from "@/lib/countries";

type Author = {
  display_name: string;
  avatar_color: string;
  country_code: string | null;
};

export type ReflectionRow = {
  id: string;
  text: string;
  chapter_number: number;
  hearts_count: number;
  created_at: string;
  users: Author | null;
};

export type ChapterRow = {
  number: number;
  title: string;
  milestone_label: string | null;
};

type Props = {
  reflections: ReflectionRow[];
  myReactionIds: string[];
  chapters: ChapterRow[];
  currentUserId: string;
};

function relativeTime(iso: string): string {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en", { month: "short", year: "numeric" });
}

export default function CircleFeed({
  reflections,
  myReactionIds,
  chapters,
  currentUserId,
}: Props) {
  const [activeChapter, setActiveChapter] = useState<number | null>(null);
  const [reacted, setReacted] = useState<Set<string>>(new Set(myReactionIds));
  const [heartCounts, setHeartCounts] = useState<Record<string, number>>(
    Object.fromEntries(reflections.map((r) => [r.id, r.hearts_count]))
  );

  const visible =
    activeChapter === null
      ? reflections
      : reflections.filter((r) => r.chapter_number === activeChapter);

  async function toggleReaction(reflectionId: string) {
    const supabase = createClient();
    if (reacted.has(reflectionId)) {
      setReacted((prev) => {
        const next = new Set(prev);
        next.delete(reflectionId);
        return next;
      });
      setHeartCounts((prev) => ({
        ...prev,
        [reflectionId]: Math.max(0, (prev[reflectionId] ?? 1) - 1),
      }));
      await supabase
        .from("reactions")
        .delete()
        .eq("user_id", currentUserId)
        .eq("reflection_id", reflectionId);
    } else {
      setReacted((prev) => new Set(prev).add(reflectionId));
      setHeartCounts((prev) => ({
        ...prev,
        [reflectionId]: (prev[reflectionId] ?? 0) + 1,
      }));
      await supabase
        .from("reactions")
        .insert({ user_id: currentUserId, reflection_id: reflectionId });
    }
  }

  return (
    <div>
      {/* Chapter filter chips */}
      {chapters.length > 0 && (
        <div className="flex gap-2 flex-wrap mb-8">
          <button
            onClick={() => setActiveChapter(null)}
            className={`px-4 py-1.5 rounded-full text-sm transition-colors ${
              activeChapter === null
                ? "bg-pink-deep text-white"
                : "bg-pink-pale text-pink-deep hover:bg-pink-dusty hover:text-white"
            }`}
          >
            All
          </button>
          {chapters.map((ch) => (
            <button
              key={ch.number}
              onClick={() => setActiveChapter(ch.number)}
              className={`px-4 py-1.5 rounded-full text-sm transition-colors ${
                activeChapter === ch.number
                  ? "bg-pink-deep text-white"
                  : "bg-pink-pale text-pink-deep hover:bg-pink-dusty hover:text-white"
              }`}
            >
              Ch.&nbsp;{ch.number}
            </button>
          ))}
        </div>
      )}

      {/* Feed */}
      {visible.length === 0 ? (
        <p className="text-center text-gray-400 py-16 italic">
          {activeChapter
            ? "Nothing shared from this chapter yet. Yours could be the first."
            : "The Circle is quiet for now. Reflections appear here when readers choose to share after claiming a badge."}
        </p>
      ) : (
        <div className="space-y-4">
          {visible.map((r) => {
            const author = r.users;
            const hasReacted = reacted.has(r.id);
            const count = heartCounts[r.id] ?? 0;
            const flag =
              author?.country_code ? codeToFlag(author.country_code) : null;
            const initial = author?.display_name?.[0]?.toUpperCase() ?? "?";

            return (
              <div
                key={r.id}
                className="bg-white border border-pink-pale rounded-xl2 p-5"
              >
                {/* Header: avatar + name + chapter / time */}
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-medium text-white"
                    style={{ backgroundColor: author?.avatar_color ?? "#E8A0B8" }}
                  >
                    {initial}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-ink">
                      {author?.display_name ?? "Someone"}
                    </span>
                    {flag && (
                      <span className="ml-1.5 text-sm" aria-hidden="true">
                        {flag}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0 text-xs text-gray-300">
                    <span>Ch.&nbsp;{r.chapter_number}</span>
                    <span>·</span>
                    <span>{relativeTime(r.created_at)}</span>
                  </div>
                </div>

                {/* Reflection text */}
                <p className="text-ink leading-relaxed mb-4 italic">
                  &ldquo;{r.text}&rdquo;
                </p>

                {/* "I felt this" reaction */}
                <button
                  onClick={() => toggleReaction(r.id)}
                  className={`flex items-center gap-1.5 text-sm transition-colors ${
                    hasReacted
                      ? "text-pink-deep"
                      : "text-gray-400 hover:text-pink-deep"
                  }`}
                  aria-label={hasReacted ? "Remove reaction" : "React: I felt this"}
                >
                  <span className="text-base leading-none">
                    {hasReacted ? "♥" : "♡"}
                  </span>
                  <span>
                    {count > 0 ? `${count} · ` : ""}I felt this
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
