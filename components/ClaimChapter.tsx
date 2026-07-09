"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import MuxPlayer from "@mux/mux-player-react";

type Props = {
  book: { id: string; title: string; slug: string };
  chapter: {
    id: string;
    number: number;
    title: string;
    milestone_label: string | null;
    reflect_question: string;
    mux_playback_id: string | null;
    badges: { id: string; name: string; icon: string | null; description: string | null } | any;
  };
  alreadyClaimed: boolean;
  isLocked: boolean;
};

// This is the moment the book's printed "Milestone Unlocked" box becomes
// real: writing a reflection is what claims the badge and unlocks the video.
// Visiting the link is never enough on its own — see the honor-system
// discussion: the reflection is the point, not a formality.
export default function ClaimChapter({ book, chapter, alreadyClaimed, isLocked }: Props) {
  const [reflection, setReflection] = useState("");
  const [shareToCircle, setShareToCircle] = useState(true);
  const [claimed, setClaimed] = useState(alreadyClaimed);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const badge = chapter.badges;

  async function handleClaim() {
    if (!reflection.trim()) {
      setError("Write your reflection first, then claim your badge.");
      return;
    }
    setSubmitting(true);
    setError(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

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

    await supabase.from("reflections").insert({
      user_id: user.id,
      chapter_id: chapter.id,
      book_id: book.id,
      chapter_number: chapter.number,
      text: reflection.trim(),
      is_hidden: !shareToCircle,
    });

    await supabase
      .from("user_books")
      .upsert(
        { user_id: user.id, book_id: book.id, current_chapter: chapter.number + 1, badges_earned: 1 },
        { onConflict: "user_id,book_id" }
      );

    setSubmitting(false);
    setClaimed(true);
  }

  if (isLocked) {
    return (
      <main className="max-w-lg mx-auto px-6 py-24 text-center">
        <h1 className="text-2xl mb-3">Not quite yet</h1>
        <p>This chapter unlocks once you've reached it in your journey. Keep going!</p>
      </main>
    );
  }

  return (
    <main className="max-w-lg mx-auto px-6 py-16">
      <p className="text-sm text-gray-500 mb-1">
        {book.title} · {chapter.milestone_label}
      </p>
      <h1 className="text-3xl mb-6">{chapter.title}</h1>

      {!claimed ? (
        <div className="bg-blue-soft rounded-xl2 p-6 mb-6">
          <h2 className="text-lg mb-2">Reflect</h2>
          <p className="mb-4">{chapter.reflect_question}</p>
          <textarea
            value={reflection}
            onChange={(e) => setReflection(e.target.value)}
            maxLength={280}
            rows={4}
            placeholder="Your reflection…"
            className="w-full rounded-lg border border-gray-200 p-3 mb-3"
          />
          <label className="flex items-center gap-2 text-sm mb-4">
            <input
              type="checkbox"
              checked={shareToCircle}
              onChange={(e) => setShareToCircle(e.target.checked)}
            />
            Share this reflection in the Circle
          </label>
          {error && <p className="text-pink-deep text-sm mb-3">{error}</p>}
          <button
            onClick={handleClaim}
            disabled={submitting}
            className="bg-pink-pale hover:bg-pink-dusty transition-colors text-pink-deep font-display px-6 py-3 rounded-xl2 disabled:opacity-50"
          >
            {submitting ? "Claiming…" : `Claim your ${badge.name}`}
          </button>
        </div>
      ) : (
        <div className="bg-pink-pale rounded-xl2 p-6 text-center">
          <p className="uppercase tracking-wide text-pink-deep text-sm mb-2">Milestone Unlocked!</p>
          <h2 className="text-2xl mb-4">{badge.name}</h2>
          {badge.description && <p className="text-sm mb-6">{badge.description}</p>}

          {chapter.mux_playback_id ? (
            <MuxPlayer playbackId={chapter.mux_playback_id} streamType="on-demand" />
          ) : (
            <p className="text-sm italic text-gray-500">Video coming soon.</p>
          )}
        </div>
      )}
    </main>
  );
}
