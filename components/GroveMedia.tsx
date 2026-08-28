import { extractYouTubeId, isImageUrl } from "@/lib/youtube";

// Three render paths, nothing more: a recognized YouTube URL embeds as
// an actual player, a recognized image extension renders inline, and
// everything else (a Vimeo link, a random article, anything) falls back
// to a plain link -- no general-purpose embed/oEmbed system, on purpose.
export default function GroveMedia({ url }: { url: string }) {
  const youtubeId = extractYouTubeId(url);
  if (youtubeId) {
    return (
      <div className="relative w-full aspect-video rounded-xl2 overflow-hidden bg-black">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${youtubeId}`}
          title="YouTube video"
          className="absolute inset-0 w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  if (isImageUrl(url)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={url} alt="" className="w-full rounded-xl2 object-cover" />
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-sm text-pink-deep hover:underline break-all"
    >
      {url}
    </a>
  );
}
