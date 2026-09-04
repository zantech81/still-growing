"use client";

import { useState } from "react";
import ShareButton from "./ShareButton";

type Props = {
  postId: string;
  title: string;
  initialHeartsCount: number;
  initialHasReacted: boolean;
  // Hidden entirely for a signed-out visitor rather than shown-disabled --
  // CircleFeed.tsx's own reaction button never has to make this call since
  // that whole page is signed-in only, but Grove is read by both, so this
  // is the equivalent decision made explicit.
  signedIn: boolean;
};

export default function GrovePostActions({ postId, title, initialHeartsCount, initialHasReacted, signedIn }: Props) {
  const [hasReacted, setHasReacted] = useState(initialHasReacted);
  const [count, setCount] = useState(initialHeartsCount);

  // Same optimistic-update-then-correct-from-server pattern as
  // CircleFeed.tsx's toggleReaction -- flip the icon and the count
  // immediately, then replace the local delta with the authoritative
  // hearts_count the API returns (corrects for any reactions other
  // sessions added since this page loaded).
  async function toggleReaction() {
    const adding = !hasReacted;
    setHasReacted(adding);
    setCount((prev) => Math.max(0, prev + (adding ? 1 : -1)));

    const res = await fetch("/api/grove-reactions", {
      method: adding ? "POST" : "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ grove_post_id: postId }),
    });

    const data = await res.json().catch(() => ({}));
    if (data.hearts_count != null) {
      setCount(data.hearts_count);
    }
  }

  return (
    <div className="flex items-center mt-4 pt-4 border-t border-pink-pale">
      {signedIn && (
        <button
          onClick={toggleReaction}
          className={`flex items-center gap-1.5 text-sm transition-colors ${
            hasReacted ? "text-pink-deep" : "text-gray-400 hover:text-pink-deep"
          }`}
          aria-label={hasReacted ? "Remove reaction" : "React: I felt this"}
        >
          <span className="text-base leading-none">{hasReacted ? "♥" : "♡"}</span>
          <span>{count > 0 ? `${count} · ` : ""}I felt this</span>
        </button>
      )}
      {/* Direct-URL share mode (components/ShareButton.tsx): the post's
          own anchor (id={post.id} on its <article>, app/grove/page.tsx) is
          already a stable, permanent URL, so there's no shares row to mint.
          `?post=${postId}` alongside the same id as a hash: the query
          param is what the server can actually read (a hash fragment
          never reaches it) -- app/grove/page.tsx's generateMetadata uses
          it to show this specific post's title/excerpt in a shared link's
          preview. The hash is kept too so the existing plain-HTML
          scroll-to-post behavior (no JS) keeps working exactly as before.
          Image is /api/og/grove?post=<id> -- that post's own card
          (lib/og/renderShareImage.tsx's grovePostCardTree), not the
          generic one, so the in-app preview matches what an external
          platform actually unfurls. */}
      <ShareButton
        type="grove"
        directUrl={`/grove?post=${postId}#${postId}`}
        directImageUrl={`/api/og/grove?post=${postId}`}
        iconOnly
        className="ml-auto"
        label="Share this post"
        shareTitle={`${title} · The Grove`}
        shareText={`"${title}" on The Grove`}
      />
    </div>
  );
}
