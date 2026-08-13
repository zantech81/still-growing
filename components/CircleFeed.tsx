"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Avatar from "@/components/Avatar";
import ReflectionActions from "@/components/ReflectionActions";
import ShareButton from "@/components/ShareButton";
import { COUNTRIES } from "@/lib/countries";

const COUNTRY_NAMES = new Map(COUNTRIES.map((c) => [c.code, c.name]));

// "2026-08" -- sortable and stable across locales, unlike a formatted
// label. Local time, not UTC: a reflection posted late at night should
// group under the month the reader who wrote it actually experienced.
function dateKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function dateLabel(key: string): string {
  const [year, month] = key.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en", { month: "short", year: "numeric" });
}

type Author = {
  nickname: string | null;
  display_name: string;
  avatar_key: string | null;
  avatar_color: string;
  country_code: string | null;
};

// Matches the stroke-icon convention used in AppNav.tsx / ReflectionActions.tsx:
// 24x24 viewbox, currentColor stroke, no fill, round caps/joins.
function FlagIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <line x1="4" y1="22" x2="4" y2="15" />
    </svg>
  );
}

function ReportButton({
  reported,
  onReport,
  className,
}: {
  reported: boolean;
  onReport: () => void;
  className?: string;
}) {
  return (
    <button
      onClick={onReport}
      disabled={reported}
      aria-label={reported ? "Reported" : "Report reflection"}
      title={reported ? "Reported" : "Report reflection"}
      className={`w-11 h-11 flex items-center justify-center text-gray-300 hover:text-gray-500 transition-colors disabled:hover:text-gray-300 shrink-0 ${className ?? ""}`}
    >
      <FlagIcon />
    </button>
  );
}

// A small sprout/seedling, deliberately distinct from the heart reaction's
// "I felt this" (an emotional response to the words) -- "Root for" is a
// standing show of support for the PERSON, so it reads as its own action
// rather than a second way to like the same reflection.
function SproutIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21V10" />
      <path d="M12 14c0-4-3-7-7-7 0 4 3 7 7 7z" />
      <path d="M12 10c0-3.5 2.5-6 6-6 0 3.5-2.5 6-6 6z" />
    </svg>
  );
}

function RootForButton({
  authorName,
  rooting,
  onToggle,
  className,
}: {
  authorName: string;
  rooting: boolean;
  onToggle: () => void;
  className?: string;
}) {
  const label = rooting ? `Stop rooting for ${authorName}` : `Root for ${authorName}`;
  return (
    <button
      onClick={onToggle}
      aria-label={label}
      title={label}
      className={`w-11 h-11 flex items-center justify-center transition-colors shrink-0 ${
        rooting ? "text-plum" : "text-gray-400 hover:text-plum"
      } ${className ?? ""}`}
    >
      <SproutIcon />
    </button>
  );
}

export type ReflectionRow = {
  id: string;
  user_id: string;
  text: string;
  chapter_number: number;
  hearts_count: number;
  edit_count: number;
  allow_external_share: boolean;
  created_at: string;
  users: Author | null;
};

export type ChapterRow = {
  number: number;
  title: string;
  milestone_label: string | null;
};

// PostgREST returns many-to-one joins as a single object, but this
// normalizes defensively in case the shape ever comes back as an array.
// Shared by the country filter's option derivation and the feed
// rendering below, so the two can't drift into checking the shape
// differently.
function getAuthor(row: ReflectionRow): Author | null {
  const raw = row.users;
  return Array.isArray(raw) ? (raw[0] ?? null) : raw;
}

type Props = {
  reflections: ReflectionRow[];
  myReactionIds: string[];
  myReportedIds: string[];
  // Author user_ids the viewer already roots for -- a person-level
  // relationship (see supabase/migrations/0029_connections.sql), not
  // per-reflection, so the same set applies to every card by that author.
  myRootedForIds: string[];
  // Reflection ids the viewer has pinned to their own profile (see
  // supabase/migrations/0038_profile_pins.sql) -- only ever relevant for
  // the viewer's own reflections, same scoping as the pin button itself.
  myPinnedIds: string[];
  chapters: ChapterRow[];
  currentUserId: string;
  // Viewer's own profile country, for the Country filter's "Your Country"
  // quick option. Null when unset -- that option simply doesn't render
  // rather than showing disabled (see CircleFeed's filter bar below).
  myCountryCode: string | null;
  maxLength: number;
  bookId: string;
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
  reflections: initialReflections,
  myReactionIds,
  myReportedIds,
  myRootedForIds,
  myPinnedIds,
  chapters,
  currentUserId,
  myCountryCode,
  maxLength,
  bookId,
}: Props) {
  const [reflections, setReflections] = useState<ReflectionRow[]>(initialReflections);
  // Four independent filter dimensions that AND together, not a single
  // selected-filter variable: "All"/"Mine" is just the author-scope
  // dimension's two states, and Chapter/Country/Date each layer on top
  // of it and each other (e.g. Mine + Chapter 3 + a specific month, all
  // at once). "" is every dimension's "no filter" value, so plain
  // <select> elements never need to juggle null.
  const [authorScope, setAuthorScope] = useState<"all" | "mine">("all");
  const [chapterFilter, setChapterFilter] = useState("");
  const [countryFilter, setCountryFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [reacted, setReacted] = useState<Set<string>>(new Set(myReactionIds));
  const [reported, setReported] = useState<Set<string>>(new Set(myReportedIds));
  const [rootedFor, setRootedFor] = useState<Set<string>>(new Set(myRootedForIds));
  const [pinned, setPinned] = useState<Set<string>>(new Set(myPinnedIds));
  const [heartCounts, setHeartCounts] = useState<Record<string, number>>(
    Object.fromEntries(initialReflections.map((r) => [r.id, r.hearts_count]))
  );

  // Stamp localStorage so CircleUnreadCount knows when this user last saw the Circle.
  useEffect(() => {
    localStorage.setItem(`sg_circle_last_visit_${currentUserId}`, Date.now().toString());
  }, [currentUserId]);

  // Stable ref of reflection IDs. Never changes after mount, safe to use in effect with [] deps.
  const reflectionIdsRef = useRef<string[]>(reflections.map((r) => r.id));
  // Cooldown: don't refetch more than once every 10 seconds on repeated tab switches.
  const lastRefreshAt = useRef(0);

  useEffect(() => {
    if (reflectionIdsRef.current.length === 0) return;

    async function refreshCounts() {
      const now = Date.now();
      if (now - lastRefreshAt.current < 10_000) return;
      lastRefreshAt.current = now;

      const supabase = createClient();
      const { data } = await supabase
        .from("reflections")
        .select("id, hearts_count")
        .in("id", reflectionIdsRef.current);

      if (data) {
        setHeartCounts((prev) => {
          const next = { ...prev };
          for (const row of data) next[row.id] = row.hearts_count;
          return next;
        });
      }
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") refreshCounts();
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []); // register once on mount, clean up on unmount

  // Already includes its own "Milestone: " prefix (see
  // components/admin/ChapterForm.tsx's "Milestone label" field and every
  // other surface that shows it -- ClaimChapter.tsx, app/[book]/page.tsx,
  // the admin chapter list -- all interpolate this value as-is, never
  // prepending a second "Milestone: "), so this lookup's result is
  // printed directly rather than wrapped in another label.
  const milestoneByChapter = new Map(chapters.map((ch) => [ch.number, ch.milestone_label]));

  // Filter option lists are derived from the full incoming reflections
  // pool (already scoped server-side to is_hidden=false and an unlocked
  // chapter, see app/circle/page.tsx), not from `visible` below --
  // otherwise picking one filter would shrink what the OTHER dropdowns
  // even offer, which reads as broken rather than helpful.
  const countryOptions = useMemo(() => {
    const codes = new Set<string>();
    for (const r of reflections) {
      const code = getAuthor(r)?.country_code;
      if (code) codes.add(code);
    }
    // The viewer's own country already gets its own "Your Country" entry
    // (see the <select> below), so it's excluded here to avoid listing
    // the same country twice.
    return [...codes]
      .filter((code) => code !== myCountryCode)
      .sort((a, b) => (COUNTRY_NAMES.get(a) ?? a).localeCompare(COUNTRY_NAMES.get(b) ?? b));
  }, [reflections, myCountryCode]);

  const dateOptions = useMemo(() => {
    const keys = new Set<string>();
    for (const r of reflections) keys.add(dateKey(r.created_at));
    return [...keys].sort().reverse(); // newest first, matching the feed's own default order
  }, [reflections]);

  // Four independent filters, ANDed by successive .filter() calls --
  // deliberately not a single selected-filter variable, so e.g. Mine +
  // Chapter 3 + a specific month can all narrow the same result at once.
  let visible = reflections;
  if (authorScope === "mine") visible = visible.filter((r) => r.user_id === currentUserId);
  if (chapterFilter) visible = visible.filter((r) => r.chapter_number === Number(chapterFilter));
  if (countryFilter) visible = visible.filter((r) => getAuthor(r)?.country_code === countryFilter);
  if (dateFilter) visible = visible.filter((r) => dateKey(r.created_at) === dateFilter);

  const anyFilterActive =
    authorScope === "mine" || !!chapterFilter || !!countryFilter || !!dateFilter;

  function clearFilters() {
    setAuthorScope("all");
    setChapterFilter("");
    setCountryFilter("");
    setDateFilter("");
  }

  async function toggleReaction(reflectionId: string) {
    const adding = !reacted.has(reflectionId);

    // Optimistic UI: flip the icon and apply a local delta immediately.
    if (adding) {
      setReacted((prev) => new Set(prev).add(reflectionId));
      setHeartCounts((prev) => ({ ...prev, [reflectionId]: (prev[reflectionId] ?? 0) + 1 }));
    } else {
      setReacted((prev) => { const next = new Set(prev); next.delete(reflectionId); return next; });
      setHeartCounts((prev) => ({ ...prev, [reflectionId]: Math.max(0, (prev[reflectionId] ?? 1) - 1) }));
    }

    const res = await fetch("/api/reactions", {
      method: adding ? "POST" : "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reflection_id: reflectionId }),
    });

    // Replace local delta with the authoritative DB count returned by the API.
    // This corrects for any reactions other sessions added since this page loaded.
    const data = await res.json().catch(() => ({}));
    if (data.hearts_count != null) {
      setHeartCounts((prev) => ({ ...prev, [reflectionId]: data.hearts_count }));
    }
  }

  async function toggleRootFor(authorId: string) {
    const adding = !rootedFor.has(authorId);

    // Optimistic UI, same pattern as toggleReaction. Since this is a
    // person-level relationship rather than per-reflection, flipping it
    // here updates every card by this author at once (they share the
    // same Set membership check).
    setRootedFor((prev) => {
      const next = new Set(prev);
      if (adding) next.add(authorId);
      else next.delete(authorId);
      return next;
    });

    // book_id is only meaningful (and only sent) on creation -- it
    // records which book's Circle this connection originated from (see
    // supabase/migrations/0031_connections_book_id.sql), data capture
    // only, no UI reads it yet.
    const res = await fetch("/api/connections", {
      method: adding ? "POST" : "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(adding ? { rooted_for_id: authorId, book_id: bookId } : { rooted_for_id: authorId }),
    });

    if (!res.ok) {
      // Roll back on failure, mirroring the optimistic-update-with-
      // correction pattern used for reactions (which corrects from the
      // server's authoritative count instead; there's no count to
      // correct from here, so a straight revert is the equivalent).
      setRootedFor((prev) => {
        const next = new Set(prev);
        if (adding) next.delete(authorId);
        else next.add(authorId);
        return next;
      });
    }
  }

  async function reportReflection(reflectionId: string) {
    if (reported.has(reflectionId)) return;
    // Optimistic: mark reported immediately, no undo (reports aren't retractable).
    setReported((prev) => new Set(prev).add(reflectionId));

    await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reflection_id: reflectionId }),
    });
  }

  const selectClass = (active: boolean) =>
    `text-sm border rounded-lg pl-3 pr-2 py-1.5 bg-white focus:outline-none focus:border-pink-dusty transition-colors ${
      active ? "border-pink-dusty text-pink-deep" : "border-gray-200 text-ink"
    }`;

  return (
    <div>
      {/* Filter bar: pills group and dropdowns group are two separate
          flex children so pills always stay together on their own line
          on mobile (flex-col) even though there'd technically be room
          left over for a dropdown to tuck in beside them -- they only
          become visually one row once the viewport is wide enough for
          sm:flex-row to kick in, at which point the gap between the two
          groups matches the gap within each so the seam is invisible. */}
      {chapters.length > 0 && (
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center mb-8">
          <div className="flex gap-2">
            <button
              onClick={() => setAuthorScope("all")}
              className={`px-4 py-1.5 rounded-full text-sm transition-colors ${
                authorScope === "all"
                  ? "bg-pink-deep text-white"
                  : "bg-pink-pale text-pink-deep hover:bg-pink-dusty hover:text-white"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setAuthorScope("mine")}
              className={`px-4 py-1.5 rounded-full text-sm transition-colors ${
                authorScope === "mine"
                  ? "bg-plum text-white"
                  : "bg-pink-pale text-pink-deep hover:bg-pink-dusty hover:text-white"
              }`}
            >
              Mine
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            <select
              value={chapterFilter}
              onChange={(e) => setChapterFilter(e.target.value)}
              className={selectClass(!!chapterFilter)}
              aria-label="Filter by chapter"
            >
              <option value="">All Chapters</option>
              {chapters.map((ch) => (
                <option key={ch.number} value={ch.number}>
                  Chapter {ch.number}
                </option>
              ))}
            </select>

            <select
              value={countryFilter}
              onChange={(e) => setCountryFilter(e.target.value)}
              className={selectClass(!!countryFilter)}
              aria-label="Filter by country"
            >
              <option value="">All Countries</option>
              {myCountryCode && (
                <option value={myCountryCode}>
                  Your Country ({COUNTRY_NAMES.get(myCountryCode) ?? myCountryCode})
                </option>
              )}
              {countryOptions.map((code) => (
                <option key={code} value={code}>
                  {COUNTRY_NAMES.get(code) ?? code}
                </option>
              ))}
            </select>

            {dateOptions.length > 0 && (
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className={selectClass(!!dateFilter)}
                aria-label="Filter by month"
              >
                <option value="">All Dates</option>
                {dateOptions.map((key) => (
                  <option key={key} value={key}>
                    {dateLabel(key)}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      )}

      {/* Feed */}
      {visible.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-400 italic mb-3">
            {anyFilterActive
              ? authorScope === "mine" && !chapterFilter && !countryFilter && !dateFilter
                ? "You haven't shared any reflections yet. Claim a chapter badge to share your first."
                : "Nothing matches these filters yet."
              : "The Circle is quiet for now. Reflections appear here when readers choose to share after claiming a badge."}
          </p>
          {anyFilterActive && (
            <button onClick={clearFilters} className="text-sm text-pink-deep hover:underline">
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {visible.map((r) => {
            const author = getAuthor(r);
            const hasReacted = reacted.has(r.id);
            const count = heartCounts[r.id] ?? 0;
            const authorName = author?.nickname ?? author?.display_name ?? "Someone";

            return (
              <div
                key={r.id}
                className="bg-white border border-pink-pale rounded-xl2 p-5"
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3 mb-3">
                  <Link href={`/u/${r.user_id}`} className="flex items-center gap-3 min-w-0 sm:flex-1 hover:opacity-80 transition-opacity">
                    <Avatar
                      avatarKey={author?.avatar_key ?? null}
                      countryCode={author?.country_code ?? null}
                      avatarColor={author?.avatar_color ?? "#E8A0B8"}
                      name={authorName}
                      size={32}
                    />
                    <span className="text-sm font-medium text-ink truncate">{authorName}</span>
                  </Link>
                  <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap sm:flex-shrink-0 pl-11 sm:pl-0 text-xs text-gray-300">
                    {milestoneByChapter.get(r.chapter_number) && (
                      <>
                        <span className="truncate max-w-[180px] sm:max-w-none">{milestoneByChapter.get(r.chapter_number)}</span>
                        <span>·</span>
                      </>
                    )}
                    <span>Ch.&nbsp;{r.chapter_number}</span>
                    <span>·</span>
                    <span>{relativeTime(r.created_at)}</span>
                  </div>
                </div>

                <p className="text-ink leading-relaxed mb-4 italic">
                  &ldquo;{r.text}&rdquo;
                </p>

                {/* Everything lives in one row now: reaction + own-post
                    Edit/Delete/lock icons on the left, Share (+ Report on
                    others' posts) pushed to the right edge. Report used to
                    sit in its own row next to the reaction control; it now
                    lives only here, as the rightmost element. */}
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <button
                    onClick={() => toggleReaction(r.id)}
                    className={`flex items-center gap-1.5 text-sm transition-colors ${
                      hasReacted ? "text-pink-deep" : "text-gray-400 hover:text-pink-deep"
                    }`}
                    aria-label={hasReacted ? "Remove reaction" : "React: I felt this"}
                  >
                    <span className="text-base leading-none">{hasReacted ? "♥" : "♡"}</span>
                    <span>{count > 0 ? `${count} · ` : ""}I felt this</span>
                  </button>

                  {/* Root for: a standing show of support for the PERSON,
                      not the reflection, so it's keyed on the author's
                      user_id and hidden on the viewer's own posts (can't
                      root for yourself, enforced again server-side and at
                      the DB level via a check constraint). */}
                  {r.user_id !== currentUserId && (
                    <RootForButton
                      authorName={authorName}
                      rooting={rootedFor.has(r.user_id)}
                      onToggle={() => toggleRootFor(r.user_id)}
                    />
                  )}

                  {r.user_id === currentUserId && (
                    <ReflectionActions
                      reflectionId={r.id}
                      text={r.text}
                      editCount={r.edit_count}
                      maxLength={maxLength}
                      heartsCount={count}
                      // Everything CircleFeed renders is, by construction,
                      // currently visible: the /circle page only ever fetches
                      // is_hidden = false rows, and spam/reported reflections
                      // are always hidden. So the only toggle direction ever
                      // reachable here is "Make private" (isHidden=false).
                      isHidden={false}
                      flagReason={null}
                      isPinned={pinned.has(r.id)}
                      onPinChanged={(isPinnedNow) => {
                        setPinned((prev) => {
                          const next = new Set(prev);
                          if (isPinnedNow) next.add(r.id);
                          else next.delete(r.id);
                          return next;
                        });
                      }}
                      onUpdated={(updated) => {
                        // An edit that gets newly flagged as spam becomes hidden,
                        // so it drops out of the public feed entirely.
                        if (updated.is_hidden) {
                          setReflections((prev) => prev.filter((item) => item.id !== r.id));
                          return;
                        }
                        // Reactions are explicitly cleared server-side whenever
                        // an edit actually changes the text (see
                        // clearReactionsOnEdit in the API route). Mirror that
                        // here immediately rather than waiting for the next
                        // background heart-count refresh.
                        setHeartCounts((prev) => ({ ...prev, [r.id]: updated.hearts_count }));
                        setReacted((prev) => {
                          const next = new Set(prev);
                          next.delete(r.id);
                          return next;
                        });
                        setReflections((prev) =>
                          prev.map((item) =>
                            item.id === r.id
                              ? { ...item, text: updated.text, edit_count: updated.edit_count }
                              : item
                          )
                        );
                      }}
                      onDeleted={() =>
                        setReflections((prev) => prev.filter((item) => item.id !== r.id))
                      }
                      onVisibilityChanged={(isHiddenNow) => {
                        // "Make private" is the only reachable direction here
                        // (see isHidden={false} above); once hidden, it no
                        // longer belongs in the public feed.
                        if (isHiddenNow) {
                          setReflections((prev) => prev.filter((item) => item.id !== r.id));
                        }
                      }}
                    />
                  )}

                  {/* Own reflections: always shareable. Someone else's: only
                      when the author explicitly opted in at submission time
                      (allow_external_share). Everything rendered here is
                      already is_hidden = false by construction (see the
                      /circle page query), so that half of the gate is
                      already satisfied for every row in this list. The real
                      enforcement is server-side in app/api/shares/route.ts;
                      this only controls whether the button appears.
                      ml-auto goes on whichever of Share/Report renders
                      first, so the right-hand group is pushed to the edge
                      without an extra wrapping div (see the CSS-sizing
                      lesson in components/ClaimChapter.tsx). */}
                  {(r.user_id === currentUserId || r.allow_external_share) && (
                    <ShareButton
                      type="reflection"
                      bookId={bookId}
                      referenceId={r.id}
                      requireConfirmation
                      iconOnly
                      className="ml-auto"
                      label="Share to social media"
                      shareTitle={
                        r.user_id === currentUserId
                          ? "A reflection from my Still Growing journey"
                          : "A reflection from the Still Growing Circle"
                      }
                      shareText={r.text}
                    />
                  )}

                  {r.user_id !== currentUserId && (
                    <ReportButton
                      reported={reported.has(r.id)}
                      onReport={() => reportReflection(r.id)}
                      className={r.allow_external_share ? "" : "ml-auto"}
                    />
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
