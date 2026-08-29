"use client";

import MuxPlayer from "@mux/mux-player-react";

// Renders the one custom case app/grove/page.tsx's <ReactMarkdown> hands
// off from its `pre` override: a fenced code block written by
// components/admin/grove-editor/muxVideoBlock.ts as
// ```mux-video\n{playbackId}\n```. MuxPlayer needs a client component
// (same reason components/ClaimChapter.tsx, which renders the reward-
// video equivalent, is "use client") -- the async server page can't
// render it directly.
export default function GroveVideoBlock({ playbackId }: { playbackId: string }) {
  return (
    <div className="my-4 aspect-video rounded-xl2 overflow-hidden bg-black">
      <MuxPlayer playbackId={playbackId} streamType="on-demand" style={{ width: "100%", height: "100%" }} />
    </div>
  );
}
