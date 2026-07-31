import Link from "next/link";

// Extracted from app/r/[shareId]/page.tsx's own "book pitch" section
// (written for cold traffic with zero prior context) so app/u/[userId]/
// page.tsx can show the exact same section under the exact same
// condition -- no session -- rather than a second, drifting copy of it.
// Deliberately compact: a thumbnail (not a full lifestyle photo) and a
// couple of tight lines, "here's where this came from, want the same
// thing?" rather than a competing product page.
//
// Title/description are still the same literal copy the original inline
// version had (not derived from a book's own title/description columns)
// -- this was already a deliberate one-off for cold-traffic framing, not
// something to generalize while extracting it. The one change from the
// original: the book title renders as a styled <p> here instead of an
// <h1> -- purely a semantic-HTML fix (this component can now share a
// page with that page's own real h1, e.g. a profile owner's name), not a
// visual or copy change; same classes, same appearance.
export default function BookPromo({
  coverImageUrl,
  salesUrl,
}: {
  coverImageUrl: string | null;
  salesUrl: string | null;
}) {
  return (
    <div className="max-w-sm mx-auto text-center border-t border-pink-pale pt-10">
      <div className="flex items-center gap-4 mb-4 text-left">
        {coverImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverImageUrl}
            alt="Book cover"
            className="w-[50px] h-[66px] object-cover rounded-lg flex-shrink-0 border border-gray-100"
          />
        )}
        <div>
          <p className="font-display text-plum text-lg leading-snug">Life Lessons from a Baby</p>
          <p className="text-xs text-gray-400 leading-snug">
            What the smallest humans teach us about living, loving, and growing up
          </p>
        </div>
      </div>

      <p className="text-xs text-gray-400 mb-6 leading-relaxed">
        A badge and video for every chapter, and your own space to reflect alongside
        other readers. Free lifetime access to the Still Growing app, no subscription,
        ever.
      </p>

      {salesUrl && (
        <a
          href={salesUrl}
          className="inline-block bg-pink-pale hover:bg-pink-dusty transition-colors text-pink-deep font-display text-base px-8 py-3 rounded-xl2"
        >
          Get the Book →
        </a>
      )}

      <p className="text-xs text-gray-400 mt-4">
        Already have your copy?{" "}
        <Link href="/login" className="text-pink-deep hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
