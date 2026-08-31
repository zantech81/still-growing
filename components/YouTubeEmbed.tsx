// The youtube-nocookie.com/embed/<id> iframe pattern already proven by
// components/GroveMedia.tsx (the hero "Media URL" field's auto-embed).
// Extracted here so the Grove rich editor's inline "Insert video" ->
// YouTube-link method (components/admin/grove-editor/MuxVideoNodeView.tsx)
// and its public-page render (app/grove/page.tsx's MarkdownPre) reuse the
// exact same markup instead of each carrying a slightly different copy.
export default function YouTubeEmbed({ videoId }: { videoId: string }) {
  return (
    <div className="relative w-full aspect-video rounded-xl2 overflow-hidden bg-black">
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${videoId}`}
        title="YouTube video"
        className="absolute inset-0 w-full h-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}
