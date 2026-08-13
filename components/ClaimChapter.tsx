"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import MuxPlayer from "@mux/mux-player-react";
import ReflectionActions from "./ReflectionActions";
import ShareButton from "./ShareButton";
import EmojiPicker from "./EmojiPicker";
import { graphemeLength, insertAtCursor } from "@/lib/text";

type Badge = { id: string; name: string; icon: string | null; description: string | null; badge_image_url: string | null };

type PastReflection = {
  id: string;
  text: string;
  is_hidden: boolean;
  flag_reason: string | null;
  edit_count: number;
  hearts_count: number;
  created_at: string;
  is_pinned: boolean;
};

type Props = {
  book: { id: string; title: string; slug: string };
  chapter: {
    id: string;
    number: number;
    title: string;
    milestone_label: string | null;
    reflect_question: string;
    mux_playback_id: string | null;
    badge: Badge | null;
    hasUnlockCode: boolean;
  };
  alreadyClaimed: boolean;
  isLocked: boolean;
  pastReflections: PastReflection[];
  userId: string;
  maxLength: number;
};

function relativeTime(iso: string): string {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function ClaimChapter({ book, chapter, alreadyClaimed, isLocked, pastReflections, userId, maxLength }: Props) {
  const draftKey = `sg_draft_${chapter.id}_${userId}`;

  const [reflection, setReflection] = useState("");
  const [unlockCode, setUnlockCode] = useState("");
  const [shareToCircle, setShareToCircle] = useState(true);
  const [allowExternalShare, setAllowExternalShare] = useState(false);
  const [claimed, setClaimed] = useState(alreadyClaimed);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Set to the newly created reflection's id right after a successful
  // submit that had "Share to social media" checked, so the share panel
  // for that specific reflection renders (and auto-opens) immediately.
  // Never set on a failed/rejected submission (see handleClaim below).
  const [autoShareReflectionId, setAutoShareReflectionId] = useState<string | null>(null);
  // Honeypot: left empty by real users, filled in by bots. Never shown.
  const [website, setWebsite] = useState("");

  // Extra reflection state (unlimited badge claims, shown after claim)
  const [extraReflection, setExtraReflection] = useState("");
  const [extraShareToCircle, setExtraShareToCircle] = useState(true);
  const [extraAllowExternalShare, setExtraAllowExternalShare] = useState(false);
  const [extraSubmitting, setExtraSubmitting] = useState(false);
  const [extraError, setExtraError] = useState<string | null>(null);
  const [extraPosted, setExtraPosted] = useState(false);
  const [extraWebsite, setExtraWebsite] = useState("");
  const [extraAutoShareReflectionId, setExtraAutoShareReflectionId] = useState<string | null>(null);
  // Captured alongside the id above, since extraReflection itself is
  // cleared right after a successful submit (see handleExtraReflection).
  const [extraAutoShareText, setExtraAutoShareText] = useState("");

  // Server-loaded reflections plus any added/edited/deleted this session.
  const [reflections, setReflections] = useState<PastReflection[]>(pastReflections);

  const badge = chapter.badge;

  // Autosave debounce ref
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Textarea refs so the emoji picker can insert at the live cursor
  // position instead of always appending to the end.
  const reflectionTextareaRef = useRef<HTMLTextAreaElement>(null);
  const extraReflectionTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Restore draft on mount (only if not already claimed)
  useEffect(() => {
    if (!claimed) {
      const saved = localStorage.getItem(draftKey);
      if (saved) setReflection(saved);
    }
  }, [draftKey, claimed]);

  function handleReflectionChange(val: string) {
    setReflection(val);
    setError(null);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      if (val) localStorage.setItem(draftKey, val);
      else localStorage.removeItem(draftKey);
    }, 2000);
  }

  function handleEmojiInsert(emoji: string) {
    const { text, cursor } = insertAtCursor(reflectionTextareaRef.current, reflection, emoji);
    handleReflectionChange(text);
    requestAnimationFrame(() => {
      reflectionTextareaRef.current?.focus();
      reflectionTextareaRef.current?.setSelectionRange(cursor, cursor);
    });
  }

  function handleExtraEmojiInsert(emoji: string) {
    const { text, cursor } = insertAtCursor(extraReflectionTextareaRef.current, extraReflection, emoji);
    setExtraReflection(text);
    setExtraError(null);
    requestAnimationFrame(() => {
      extraReflectionTextareaRef.current?.focus();
      extraReflectionTextareaRef.current?.setSelectionRange(cursor, cursor);
    });
  }

  async function handleClaim() {
    if (!reflection.trim()) {
      setError("Write your reflection first, then claim your badge.");
      return;
    }
    if (graphemeLength(reflection) > maxLength) {
      setError(`Reflection must be ${maxLength} characters or fewer (currently ${graphemeLength(reflection)}).`);
      return;
    }
    if (chapter.hasUnlockCode && !unlockCode.trim()) {
      setError("Enter the password from your chapter to claim your badge.");
      return;
    }
    setSubmitting(true);
    setError(null);

    // Submit (and moderate) the reflection before claiming the badge, so a
    // rejected reflection never results in a claimed badge.
    const res = await fetch("/api/reflections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chapter_id: chapter.id,
        book_id: book.id,
        chapter_number: chapter.number,
        text: reflection.trim(),
        share_to_circle: shareToCircle,
        allow_external_share: allowExternalShare,
        website,
        is_claim: true,
        unlock_code: unlockCode.trim(),
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Something went wrong. Try again.");
      setSubmitting(false);
      return;
    }

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    if (badge) {
      const { error: badgeError } = await supabase.from("user_badges").insert({
        user_id: user.id,
        badge_id: badge.id,
        book_id: book.id,
      });

      if (badgeError) {
        setError("Something went wrong claiming your badge. Try again.");
        setSubmitting(false);
        return;
      }
    }

    await supabase
      .from("user_books")
      .upsert(
        { user_id: user.id, book_id: book.id, current_chapter: chapter.number + 1, badges_earned: chapter.number },
        { onConflict: "user_id,book_id" }
      );

    // Clear the saved draft after a successful submit
    localStorage.removeItem(draftKey);
    if (saveTimer.current) clearTimeout(saveTimer.current);

    // Track locally so the past-reflections list updates without a page reload
    setReflections((prev) => [
      {
        id: data.reflection?.id ?? crypto.randomUUID(),
        text: reflection.trim(),
        is_hidden: !shareToCircle,
        flag_reason: data.flagged ? "spam" : null,
        edit_count: 0,
        hearts_count: 0,
        created_at: new Date().toISOString(),
        is_pinned: false,
      },
      ...prev,
    ]);

    // Only reached once the POST above succeeded (moderation rejections
    // return early with an error, well before this line), so the share
    // panel never auto-opens for a reflection that didn't actually save.
    if (allowExternalShare && data.reflection?.id) {
      setAutoShareReflectionId(data.reflection.id);
    }

    setSubmitting(false);
    setClaimed(true);
  }

  async function handleExtraReflection() {
    if (!extraReflection.trim()) {
      setExtraError("Write something first.");
      return;
    }
    if (graphemeLength(extraReflection) > maxLength) {
      setExtraError(`Reflection must be ${maxLength} characters or fewer (currently ${graphemeLength(extraReflection)}).`);
      return;
    }
    setExtraSubmitting(true);
    setExtraError(null);
    setExtraAutoShareReflectionId(null);
    setExtraAutoShareText("");

    const res = await fetch("/api/reflections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chapter_id: chapter.id,
        book_id: book.id,
        chapter_number: chapter.number,
        text: extraReflection.trim(),
        share_to_circle: extraShareToCircle,
        allow_external_share: extraAllowExternalShare,
        website: extraWebsite,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setExtraError(data.error ?? "Something went wrong. Try again.");
      setExtraSubmitting(false);
      return;
    }

    setReflections((prev) => [
      {
        id: data.reflection?.id ?? crypto.randomUUID(),
        text: extraReflection.trim(),
        is_hidden: !extraShareToCircle,
        flag_reason: data.flagged ? "spam" : null,
        edit_count: 0,
        hearts_count: 0,
        created_at: new Date().toISOString(),
        is_pinned: false,
      },
      ...prev,
    ]);

    // As with the initial claim, only reached after a successful POST, so
    // a moderation rejection (which returns early above) never triggers this.
    if (extraAllowExternalShare && data.reflection?.id) {
      setExtraAutoShareReflectionId(data.reflection.id);
      setExtraAutoShareText(extraReflection.trim());
    }

    setExtraReflection("");
    setExtraSubmitting(false);
    setExtraPosted(true);
    setTimeout(() => setExtraPosted(false), 3000);
  }

  const backLink = (
    <Link
      href={`/${book.slug}`}
      className="text-sm text-gray-400 hover:text-ink transition-colors"
    >
      ← {book.title}
    </Link>
  );

  if (isLocked) {
    return (
      <main className="max-w-lg mx-auto px-6 py-8">
        <div className="mb-8">{backLink}</div>
        <div className="py-16 text-center">
          <h1 className="text-2xl mb-3">Not quite yet</h1>
          <p className="text-gray-500">This chapter unlocks once you've reached it in your journey. Keep going!</p>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-lg mx-auto px-6 py-8">
      <div className="mb-8">{backLink}</div>

      <p className="text-sm text-gray-500 mb-1">
        {book.title} · {chapter.milestone_label}
      </p>
      <h1 className="text-3xl mb-6">{chapter.title}</h1>

      {!claimed ? (
        <div className="bg-blue-soft rounded-xl2 p-6 mb-6">
          <h2 className="text-lg mb-2">Reflect</h2>
          <p className="mb-4">{chapter.reflect_question}</p>
          <p className="text-xs text-gray-400 mb-2">
            No links, emails, or phone numbers, please. This is a space for your own reflection.
          </p>
          <input
            type="text"
            name="website"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="absolute w-px h-px opacity-0 overflow-hidden -z-10"
          />
          <textarea
            ref={reflectionTextareaRef}
            value={reflection}
            onChange={(e) => handleReflectionChange(e.target.value)}
            rows={4}
            placeholder="Your reflection…"
            className={`w-full rounded-lg border p-3 ${
              graphemeLength(reflection) > maxLength ? "border-pink-deep" : "border-gray-200"
            }`}
          />
          <div className="flex justify-between items-center mb-3">
            <EmojiPicker onSelect={handleEmojiInsert} />
            <span className={`text-xs tabular-nums ${
              graphemeLength(reflection) > maxLength
                ? "text-pink-deep font-medium"
                : graphemeLength(reflection) > maxLength * 0.9
                ? "text-amber-500"
                : "text-gray-400"
            }`}>
              {graphemeLength(reflection)} / {maxLength}
            </span>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 mb-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={shareToCircle}
                onChange={(e) => setShareToCircle(e.target.checked)}
              />
              Share in the Circle
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={allowExternalShare}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setAllowExternalShare(checked);
                  // External sharing is meaningless if the reflection isn't
                  // visible in the Circle, so checking this also checks that
                  // one. The reverse doesn't hold: unchecking Circle
                  // afterward is still a valid state (the author can always
                  // share their own reflection regardless of Circle status),
                  // so that direction is deliberately not wired here.
                  if (checked) setShareToCircle(true);
                }}
              />
              Share to social media
            </label>
          </div>
          {chapter.hasUnlockCode && (
            <div className="mb-4">
              <label className="text-xs uppercase tracking-widest text-gray-400 block mb-1.5">
                Password
              </label>
              <p className="text-xs text-gray-400 mb-2">
                Enter the password from your chapter.
              </p>
              <input
                type="text"
                value={unlockCode}
                onChange={(e) => {
                  setUnlockCode(e.target.value.toUpperCase().replace(/\s/g, ""));
                  setError(null);
                }}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm uppercase tracking-widest focus:outline-none focus:border-pink-dusty transition-colors bg-white"
                spellCheck={false}
              />
            </div>
          )}
          {error && <p className="text-pink-deep text-sm mb-3">{error}</p>}
          <button
            onClick={handleClaim}
            disabled={submitting || graphemeLength(reflection) > maxLength}
            className="bg-pink-pale hover:bg-pink-dusty transition-colors text-pink-deep font-display px-6 py-3 rounded-xl2 disabled:opacity-50"
          >
            {submitting ? "Claiming…" : badge ? `Claim your ${badge.name}` : "Claim this chapter"}
          </button>
        </div>
      ) : (
        <>
          {/* Milestone unlocked card */}
          <div className="bg-pink-pale rounded-xl2 p-6 text-center mb-6">
            {/* font-bold: at text-sm regular weight, an uppercase "!" reads
                as a bare vertical stroke indistinguishable from "I"
                (confirmed by screenshot comparison -- reducing tracking
                alone did NOT fix it, only added weight or size did). Bold
                keeps the same small tracked-caps eyebrow style used
                elsewhere in the app (BABY WISDOM, BOOKS, etc.) instead of
                dropping uppercase. */}
            <p className="uppercase tracking-wide text-pink-deep text-sm font-bold mb-3">Milestone Unlocked!</p>
            {badge?.badge_image_url && (
              <img
                src={badge.badge_image_url}
                alt={badge.name}
                className="w-28 h-28 mx-auto object-contain mb-4"
              />
            )}
            {badge && <h2 className="text-2xl mb-2">{badge.name}</h2>}
            {badge?.description && <p className="text-sm text-gray-500 mb-4">{badge.description}</p>}

            {badge && (
              <div className="flex justify-center mb-6">
                <ShareButton
                  type="badge"
                  bookId={book.id}
                  referenceId={badge.id}
                  label="Share your badge"
                  shareTitle={`I earned the ${badge.name}!`}
                  shareText={`I just earned the ${badge.name} on my Still Growing journey.`}
                />
              </div>
            )}

            {chapter.mux_playback_id ? (
              // 9:16 portrait, not mux-player's own 16:9 default: reward
              // videos are shot vertically for a primarily-mobile
              // audience. Capped at max-w-[360px] (same arbitrary-
              // aspect-ratio convention already used for portrait media
              // elsewhere, e.g. LockedBookCard.tsx's book covers) so it
              // reads as a natural portrait video centered in this
              // card's max-w-lg column on desktop, rather than stretching
              // to a huge, oddly cropped rectangle -- while still being
              // comfortably full-width on mobile, where 360px rarely
              // binds against the viewport at all.
              <MuxPlayer
                playbackId={chapter.mux_playback_id}
                streamType="on-demand"
                className="w-full max-w-[360px] mx-auto rounded-xl2 overflow-hidden"
                style={{ aspectRatio: "9 / 16" }}
              />
            ) : (
              <p className="text-sm italic text-gray-400">Video coming soon.</p>
            )}
          </div>

          {/* Auto-opened the moment a reflection is submitted with "Share
              to social media" checked, so the panel is already in front of
              the person instead of requiring a separate click afterward. */}
          {autoShareReflectionId && (
            <div className="bg-white border border-pink-pale rounded-xl2 p-6 mb-6">
              <h2 className="text-base font-display text-plum mb-3">Share your reflection</h2>
              <ShareButton
                type="reflection"
                bookId={book.id}
                referenceId={autoShareReflectionId}
                requireConfirmation
                autoStart
                label="Share to social media"
                shareTitle="A reflection from my Still Growing journey"
                shareText={reflection.trim()}
              />
            </div>
          )}

          {/* Share another reflection */}
          <div className="bg-blue-soft rounded-xl2 p-6 mb-6">
            <h2 className="text-base font-display text-plum mb-1">Share another reflection</h2>
            <p className="text-sm text-gray-500 mb-4">{chapter.reflect_question}</p>
            <p className="text-xs text-gray-400 mb-2">
              No links, emails, or phone numbers, please. This is a space for your own reflection.
            </p>
            <input
              type="text"
              name="website"
              value={extraWebsite}
              onChange={(e) => setExtraWebsite(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              className="absolute w-px h-px opacity-0 overflow-hidden -z-10"
            />
            <textarea
              ref={extraReflectionTextareaRef}
              value={extraReflection}
              onChange={(e) => { setExtraReflection(e.target.value); setExtraError(null); }}
              rows={3}
              placeholder="Something else on your mind…"
              className={`w-full rounded-lg border p-3 mb-1 text-sm ${
                graphemeLength(extraReflection) > maxLength ? "border-pink-deep" : "border-gray-200"
              }`}
            />
            <div className="flex justify-between items-center mb-3">
              <EmojiPicker onSelect={handleExtraEmojiInsert} />
              <span className={`text-xs tabular-nums ${
                graphemeLength(extraReflection) > maxLength
                  ? "text-pink-deep font-medium"
                  : graphemeLength(extraReflection) > maxLength * 0.9
                  ? "text-amber-500"
                  : "text-gray-400"
              }`}>
                {graphemeLength(extraReflection)} / {maxLength}
              </span>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-2 mb-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={extraShareToCircle}
                  onChange={(e) => setExtraShareToCircle(e.target.checked)}
                />
                Share in the Circle
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={extraAllowExternalShare}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setExtraAllowExternalShare(checked);
                    if (checked) setExtraShareToCircle(true);
                  }}
                />
                Share to social media
              </label>
            </div>
            {extraError && <p className="text-pink-deep text-sm mb-3">{extraError}</p>}
            {extraPosted && <p className="text-green-600 text-sm mb-3">Reflection shared!</p>}
            <button
              onClick={handleExtraReflection}
              disabled={extraSubmitting || graphemeLength(extraReflection) > maxLength}
              className="bg-pink-pale hover:bg-pink-dusty transition-colors text-pink-deep text-sm px-5 py-2.5 rounded-xl2 disabled:opacity-50"
            >
              {extraSubmitting ? "Sharing…" : "Share"}
            </button>

            {/* Auto-opened immediately after a successful submit with
                "Share to social media" checked, same as the initial claim's
                panel above. Never shown for a rejected submission, since
                handleExtraReflection returns early on !res.ok before this
                state is ever set. */}
            {extraAutoShareReflectionId && (
              <div className="mt-4 bg-white border border-pink-pale rounded-xl2 p-4">
                <ShareButton
                  type="reflection"
                  bookId={book.id}
                  referenceId={extraAutoShareReflectionId}
                  requireConfirmation
                  autoStart
                  label="Share to social media"
                  shareTitle="A reflection from my Still Growing journey"
                  shareText={extraAutoShareText}
                />
              </div>
            )}
          </div>

          {/* Past reflections for this chapter */}
          {reflections.length > 0 && (
            <div>
              <h3 className="text-xs uppercase tracking-widest text-gray-400 mb-3">
                Your reflections for this chapter
              </h3>
              <div className="space-y-3">
                {reflections.map((r) => (
                  <div key={r.id} className="bg-white border border-pink-pale rounded-xl2 px-4 py-3">
                    <p className="text-sm text-ink leading-relaxed italic">&ldquo;{r.text}&rdquo;</p>
                    {/* Metadata and the icon-only controls share one row
                        (wrapping onto its own line on narrow screens rather
                        than cramping), so Edit/Delete/lock/share sit right
                        next to "just now · Shared" instead of stacking as
                        separate text links below it. Each control's own
                        expanded state (edit textarea, delete confirm, share
                        preview) still takes the full row width when active. */}
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-2">
                      <span className="text-xs text-gray-300">{relativeTime(r.created_at)}</span>
                      <span className="text-gray-200">·</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                        r.is_hidden
                          ? "bg-gray-100 text-gray-400"
                          : "bg-pink-pale text-pink-deep"
                      }`}>
                        {r.is_hidden ? "Private" : "Shared"}
                      </span>
                      <ReflectionActions
                        reflectionId={r.id}
                        text={r.text}
                        editCount={r.edit_count}
                        maxLength={maxLength}
                        heartsCount={r.hearts_count}
                        isHidden={r.is_hidden}
                        flagReason={r.flag_reason}
                        isPinned={r.is_pinned}
                        onPinChanged={(isPinnedNow) =>
                          setReflections((prev) =>
                            prev.map((item) => (item.id === r.id ? { ...item, is_pinned: isPinnedNow } : item))
                          )
                        }
                        className="ml-auto"
                        onUpdated={(updated) =>
                          setReflections((prev) =>
                            prev.map((item) =>
                              item.id === r.id
                                ? {
                                    ...item,
                                    text: updated.text,
                                    edit_count: updated.edit_count,
                                    is_hidden: updated.is_hidden,
                                    hearts_count: updated.hearts_count,
                                  }
                                : item
                            )
                          )
                        }
                        onDeleted={() =>
                          setReflections((prev) => prev.filter((item) => item.id !== r.id))
                        }
                        onVisibilityChanged={(isHidden) =>
                          setReflections((prev) =>
                            prev.map((item) => (item.id === r.id ? { ...item, is_hidden: isHidden } : item))
                          )
                        }
                        onSpamDetected={() =>
                          setReflections((prev) =>
                            prev.map((item) => (item.id === r.id ? { ...item, flag_reason: "spam" } : item))
                          )
                        }
                      />
                      <ShareButton
                        type="reflection"
                        bookId={book.id}
                        referenceId={r.id}
                        requireConfirmation
                        iconOnly
                        label="Share to social media"
                        shareTitle="A reflection from my Still Growing journey"
                        shareText={r.text}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </main>
  );
}
