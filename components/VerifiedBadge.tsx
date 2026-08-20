// Positive-only "verified buyer" indicator (see lib/purchases.ts) --
// shown next to a name on the public profile (app/u/[userId]/page.tsx)
// when the account's email matches a completed Systeme.io purchase.
// Deliberately styled after the familiar platform-verified checkmark
// pattern (filled circle + tick) since that convention already reads as
// "confirmed," not as a value judgment on accounts without it -- most
// accounts anywhere lack a checkmark and that's normal, not suspicious.
// Uses `leaf` (the book's own signature green accent, see
// tailwind.config.ts) rather than a generic platform blue, so it reads as
// Still Growing's own mark rather than a borrowed one.
//
// title gives a native hover/long-press tooltip explaining what it means
// -- intentionally lightweight rather than a click-through modal, since
// the badge is a nice-to-have confidence signal, not something that
// needs its own dedicated UI real estate yet.
export default function VerifiedBadge() {
  return (
    <span
      title="Verified buyer: purchased with this account's email"
      aria-label="Verified buyer"
      className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-leaf flex-shrink-0"
    >
      <svg viewBox="0 0 20 20" fill="none" className="w-3 h-3" aria-hidden="true">
        <path
          d="M4 10.5L8 14.5L16 5.5"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
