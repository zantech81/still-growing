// Pure presentational, no state of its own -- extracted from
// CircleFeed.tsx (2026-08-28) so app/u/[userId]/page.tsx's profile-page
// button can render identically without copy-pasting the markup. The
// toggle/race-guard logic that drives `rooting`/`pending` stays wherever
// it already lived: CircleFeed.tsx keeps its own Set-based
// implementation (it manages many authors across one feed at once), and
// the profile page gets its own single-target version in
// components/ProfileRootFor.tsx -- see that file's comment for why this
// wasn't unified into one shared hook.
function SproutIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21V10" />
      <path d="M12 14c0-4-3-7-7-7 0 4 3 7 7 7z" />
      <path d="M12 10c0-3.5 2.5-6 6-6 0 3.5-2.5 6-6 6z" />
    </svg>
  );
}

export default function RootForButton({
  authorName,
  rooting,
  pending,
  onToggle,
  className,
}: {
  authorName: string;
  rooting: boolean;
  pending: boolean;
  onToggle: () => void;
  className?: string;
}) {
  const label = rooting ? `Stop rooting for ${authorName}` : `Root for ${authorName}`;
  return (
    <button
      onClick={onToggle}
      disabled={pending}
      aria-label={label}
      title={label}
      className={`w-11 h-11 flex items-center justify-center transition-colors shrink-0 disabled:opacity-50 ${
        rooting ? "text-plum" : "text-gray-400 hover:text-plum"
      } ${className ?? ""}`}
    >
      <SproutIcon />
    </button>
  );
}
