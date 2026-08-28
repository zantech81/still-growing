// Recognizes the common YouTube URL shapes an admin might paste into a
// Grove post's media field and extracts the video id for embedding.
// Deliberately narrow -- this is not a general oEmbed/link-preview
// system, just YouTube (the one real requirement) plus a trivial image-
// extension check in isImageUrl below; everything else falls back to a
// plain link, on purpose (see components/GroveMedia.tsx).
export function extractYouTubeId(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  const host = parsed.hostname.replace(/^www\./, "");

  if (host === "youtu.be") {
    return parsed.pathname.slice(1).split("/")[0] || null;
  }

  if (host === "youtube.com" || host === "m.youtube.com") {
    if (parsed.pathname === "/watch") {
      return parsed.searchParams.get("v");
    }
    if (parsed.pathname.startsWith("/embed/")) {
      return parsed.pathname.slice("/embed/".length).split("/")[0] || null;
    }
    if (parsed.pathname.startsWith("/shorts/")) {
      return parsed.pathname.slice("/shorts/".length).split("/")[0] || null;
    }
  }

  return null;
}

const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"];

export function isImageUrl(url: string): boolean {
  try {
    const { pathname } = new URL(url);
    return IMAGE_EXTENSIONS.some((ext) => pathname.toLowerCase().endsWith(ext));
  } catch {
    return false;
  }
}
