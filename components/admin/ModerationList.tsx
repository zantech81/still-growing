"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Reflection = {
  id: string;
  text: string;
  is_hidden: boolean;
  flag_reason: string | null;
  created_at: string;
  users: { nickname: string | null; display_name: string | null; email: string | null } | null;
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

// The single source of truth for "why is this hidden". Every other piece
// of UI (badge, unhide button, counts) reads from this instead of
// re-deriving the same is_hidden/flag_reason logic in multiple places.
type VisibilityState = "shared" | "private" | "spam" | "reported" | "admin_hidden";

function getVisibilityState(r: Pick<Reflection, "is_hidden" | "flag_reason">): VisibilityState {
  if (!r.is_hidden) return "shared";
  if (r.flag_reason === "spam") return "spam";
  if (r.flag_reason === "reported") return "reported";
  if (r.flag_reason === "admin") return "admin_hidden";
  // is_hidden with no flag_reason at all: the author simply chose not to
  // share this to the Circle. Not a moderation action, so there is no
  // "unhide" available for it (see the button logic below).
  return "private";
}

export default function ModerationList({
  reflections,
  reportCounts,
}: {
  reflections: Reflection[];
  reportCounts: Record<string, number>;
}) {
  const [items, setItems] = useState(reflections);
  const [toggling, setToggling] = useState<string | null>(null);

  const [userFilter, setUserFilter] = useState("");
  const [bookFilter, setBookFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Explicit admin hide: distinct from spam/report flags, and distinct
  // from flag_reason === null (the author's own private choice). See
  // getVisibilityState. Without setting flag_reason here, an admin-hidden
  // reflection would be indistinguishable from a private one and would
  // lose its unhide button along with real private reflections.
  async function hideReflection(id: string) {
    setToggling(id);
    const supabase = createClient();
    const { error } = await supabase
      .from("reflections")
      .update({ is_hidden: true, flag_reason: "admin" })
      .eq("id", id);

    if (!error) {
      setItems((prev) =>
        prev.map((r) => (r.id === id ? { ...r, is_hidden: true, flag_reason: "admin" } : r))
      );
    }
    setToggling(null);
  }

  // Only ever called for spam/reported/admin_hidden rows, never for
  // "private" rows, which don't render an unhide button at all.
  async function unhideReflection(id: string) {
    setToggling(id);
    const supabase = createClient();
    const { error } = await supabase
      .from("reflections")
      .update({ is_hidden: false, flag_reason: null })
      .eq("id", id);

    if (!error) {
      setItems((prev) =>
        prev.map((r) => (r.id === id ? { ...r, is_hidden: false, flag_reason: null } : r))
      );
    }
    setToggling(null);
  }

  const bookTitles = Array.from(
    new Set(
      reflections
        .map((r) => r.chapters?.books?.title)
        .filter((t): t is string => Boolean(t))
    )
  ).sort();

  const hasFilter = userFilter || bookFilter || dateFrom || dateTo;

  const visible = items.filter((r) => {
    const u = r.users;
    const authorName = (u?.nickname ?? u?.display_name ?? u?.email ?? "").toLowerCase();
    if (userFilter && !authorName.includes(userFilter.toLowerCase())) return false;
    if (bookFilter && (r.chapters?.books?.title ?? "") !== bookFilter) return false;
    if (dateFrom && r.created_at.slice(0, 10) < dateFrom) return false;
    if (dateTo && r.created_at.slice(0, 10) > dateTo) return false;
    return true;
  });

  // Breakdown by why a reflection is (or isn't) hidden, over whatever the
  // current filters produced, so "at a glance" always matches what's on
  // screen, not a flat "N hidden" count that conflates four different states.
  const stateCounts = visible.reduce(
    (acc, r) => {
      acc[getVisibilityState(r)]++;
      return acc;
    },
    { shared: 0, private: 0, spam: 0, reported: 0, admin_hidden: 0 } as Record<VisibilityState, number>
  );

  if (reflections.length === 0) {
    return <p className="text-sm text-gray-400">No reflections yet.</p>;
  }

  return (
    <div>
      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 mb-6 p-4 bg-white border border-pink-pale rounded-xl2">
        <input
          type="text"
          placeholder="Filter by nickname..."
          value={userFilter}
          onChange={(e) => setUserFilter(e.target.value)}
          className="flex-1 min-w-[160px] border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-pink-dusty"
        />
        <select
          value={bookFilter}
          onChange={(e) => setBookFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-pink-dusty"
        >
          <option value="">All books</option>
          {bookTitles.map((b) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-pink-dusty"
          />
          <span className="text-xs text-gray-400">to</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-pink-dusty"
          />
        </div>
        {hasFilter && (
          <button
            onClick={() => { setUserFilter(""); setBookFilter(""); setDateFrom(""); setDateTo(""); }}
            className="text-xs text-gray-400 hover:text-ink px-2 py-1.5 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* State breakdown: distinguishes private/spam/reported at a glance
          instead of one flat "hidden" count. Reflects whatever the filters
          above currently produce (the full set when no filters are active). */}
      <p className="text-xs text-gray-400 mb-1">
        {stateCounts.shared} shared · {stateCounts.private} private · {stateCounts.spam} spam-flagged
        · {stateCounts.reported} reported
        {stateCounts.admin_hidden > 0 && <> · {stateCounts.admin_hidden} hidden by admin</>}
      </p>

      {hasFilter && (
        <p className="text-xs text-gray-400 mb-4">
          Showing {visible.length} of {items.length}
        </p>
      )}

      {visible.length === 0 ? (
        <p className="text-sm text-gray-400">No reflections match these filters.</p>
      ) : (
        <div className="space-y-3">
          {visible.map((r) => {
            const u = r.users as unknown as { nickname: string | null; display_name: string | null; email: string | null } | null;
            const chapter = r.chapters as unknown as {
              number: number;
              title: string;
              books: { title: string } | null;
            } | null;

            const nickname = u?.nickname;
            const realName = u?.display_name ?? u?.email;
            // "private" (the author's own choice) is the only state with no
            // hide/unhide control at all. See hideReflection/unhideReflection.
            const state = getVisibilityState(r);

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
                        {nickname ?? realName ?? "Unknown"}
                      </span>
                      {nickname && realName && (
                        <span className="ml-1 text-gray-300 font-normal">({realName})</span>
                      )}
                      {chapter && (
                        <>
                          {" · "}
                          {chapter.books?.title} · Ch. {chapter.number}: {chapter.title}
                        </>
                      )}
                      {" · "}
                      {formatDate(r.created_at)}
                      {state === "private" && (
                        <span className="ml-2 bg-gray-100 text-gray-500 text-xs px-1.5 py-0.5 rounded-full">
                          Private
                        </span>
                      )}
                      {state === "admin_hidden" && (
                        <span className="ml-2 bg-slate-200 text-slate-700 text-xs px-1.5 py-0.5 rounded-full">
                          Hidden by admin
                        </span>
                      )}
                      {state === "spam" && (
                        <span className="ml-2 bg-amber-100 text-amber-600 text-xs px-1.5 py-0.5 rounded-full">
                          Spam filter
                        </span>
                      )}
                      {state === "reported" && (
                        <span className="ml-2 bg-red-100 text-red-700 text-xs px-1.5 py-0.5 rounded-full">
                          Reported, needs review
                        </span>
                      )}
                      {(reportCounts[r.id] ?? 0) > 0 && (
                        <span className="ml-2 bg-pink-pale text-pink-deep text-xs px-1.5 py-0.5 rounded-full">
                          {reportCounts[r.id]} report{reportCounts[r.id] === 1 ? "" : "s"}
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-ink leading-relaxed line-clamp-4">{r.text}</p>
                  </div>
                  {state === "private" ? (
                    <span className="flex-shrink-0 text-xs text-gray-300 px-3 py-1.5">
                      Author&rsquo;s choice
                    </span>
                  ) : (
                    <button
                      onClick={() => (r.is_hidden ? unhideReflection(r.id) : hideReflection(r.id))}
                      disabled={toggling === r.id}
                      className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-50 ${
                        r.is_hidden
                          ? "border-pink-dusty text-pink-deep hover:bg-pink-pale"
                          : "border-gray-200 text-gray-400 hover:text-ink hover:border-gray-300"
                      }`}
                    >
                      {toggling === r.id ? "…" : r.is_hidden ? "Unhide" : "Hide"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
