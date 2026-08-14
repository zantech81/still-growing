// The small icon-only "Still Growing" mark shown in every share card's
// footer (see Branding in lib/og/renderShareImage.tsx). Fetched from the
// app's own origin at request time and inlined as a data URI, same
// reasoning as loadOgFonts.ts: the edge runtime has no filesystem access,
// so public/brand/og-badge-icon.png can't be imported directly.
export async function loadOgBadgeIcon(origin: string): Promise<string> {
  const res = await fetch(new URL("/brand/og-badge-icon.png", origin));
  const buffer = await res.arrayBuffer();
  return `data:image/png;base64,${arrayBufferToBase64(buffer)}`;
}

// Buffer is available on Vercel's edge runtime for this, but a manual
// encode loop over the Uint8Array is the safe fallback if that ever
// stops being true on some edge environment.
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(buffer).toString("base64");
  }
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
