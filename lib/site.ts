// The "stillgrowing.co, or NEXT_PUBLIC_SITE_URL if set" fallback was
// duplicated across several files (app/r/[shareId]/page.tsx,
// app/u/[userId]/page.tsx, lib/sendgrid.ts, both OG image routes) as the
// same inline `process.env.NEXT_PUBLIC_SITE_URL ?? "https://stillgrowing.co"`
// line. Centralized here rather than duplicated a further time for the
// admin QR code feature; existing call sites are untouched (this doesn't
// remove any of them, just gives new code a shared place to reach for it).
export function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "https://stillgrowing.co";
}

// Same /{bookSlug}/ch{chapterNumber} pattern already used for real
// chapter links (see app/[book]/page.tsx's own chapter list), returned
// as a full URL for contexts -- QR codes, shared links -- that need an
// absolute address rather than a Next.js route to navigate to.
export function getChapterUrl(bookSlug: string, chapterNumber: number): string {
  return `${getSiteUrl()}/${bookSlug}/ch${chapterNumber}`;
}
