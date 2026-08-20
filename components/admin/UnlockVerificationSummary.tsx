// Admin-only visibility into how many of a book's unlocks match a real
// purchase (see lib/purchases.ts, purchases table in 0045_purchases.sql).
// Deliberately read-only and non-blocking -- nothing here rejects or
// restricts a redemption, it only surfaces the pattern so an admin can
// notice something worth investigating (e.g. an unusual cluster of
// unverified unlocks in a short window) and decide by hand whether to
// rotate the book's redemption_code (BookForm.tsx field, already
// admin-editable with zero extra engineering). See the "unverified" item
// in the project's engineering punch list for the fuller reasoning on why
// this stays advisory rather than automated/blocking.
//
// A handful of unverified rows is normal and expected -- a real buyer who
// checks out with one email and signs into the app with another (common
// with Google/Apple sign-in) will always show here even though nothing's
// wrong. This list is for spotting a pattern, not judging any single row.

type UnlockRow = {
  email: string | null;
  unlockedAt: string;
  verified: boolean;
};

export default function UnlockVerificationSummary({ unlocks }: { unlocks: UnlockRow[] }) {
  if (unlocks.length === 0) {
    return (
      <div className="bg-white border border-pink-pale rounded-xl2 p-5 mb-8">
        <h2 className="text-sm uppercase tracking-widest text-gray-400 mb-1">Unlock verification</h2>
        <p className="text-sm text-gray-400">No one has unlocked this book yet.</p>
      </div>
    );
  }

  const verifiedCount = unlocks.filter((u) => u.verified).length;
  const unverified = unlocks.filter((u) => !u.verified);

  return (
    <div className="bg-white border border-pink-pale rounded-xl2 p-5 mb-8">
      <h2 className="text-sm uppercase tracking-widest text-gray-400 mb-3">Unlock verification</h2>
      <p className="text-sm text-ink mb-4">
        <strong>{unlocks.length}</strong> total unlock{unlocks.length === 1 ? "" : "s"}:{" "}
        <span className="text-leaf font-medium">{verifiedCount} verified</span>,{" "}
        <span className="text-gray-400">{unverified.length} unverified</span>
      </p>

      {unverified.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer text-gray-400 hover:text-ink transition-colors">
            Show unverified emails
          </summary>
          <ul className="mt-3 space-y-1.5 max-h-64 overflow-y-auto">
            {unverified.map((u, i) => (
              <li key={i} className="flex justify-between gap-4 text-xs text-gray-400 border-b border-pink-pale/50 pb-1.5">
                <span className="truncate">{u.email ?? "(no email on account)"}</span>
                <span className="whitespace-nowrap">{new Date(u.unlockedAt).toLocaleDateString()}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
