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
//
// Amazon KDP unlocks are a second, larger expected source of "unverified":
// KDP sales never touch the Systeme.io-fed `purchases` table (0045), so a
// buyer who redeemed the book's Amazon-only code (0063_book_redemption_code_amazon.sql)
// can never verify no matter how legitimate. Splitting them out below keeps
// that known gap from diluting the "everything else" bucket this component
// exists to make legible.

type UnlockRow = {
  email: string | null;
  unlockedAt: string;
  verified: boolean;
  viaAmazonCode: boolean;
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
  const unverifiedAmazon = unverified.filter((u) => u.viaAmazonCode);
  const unverifiedOther = unverified.filter((u) => !u.viaAmazonCode);

  return (
    <div className="bg-white border border-pink-pale rounded-xl2 p-5 mb-8">
      <h2 className="text-sm uppercase tracking-widest text-gray-400 mb-3">Unlock verification</h2>
      <p className="text-sm text-ink mb-4">
        <strong>{unlocks.length}</strong> total unlock{unlocks.length === 1 ? "" : "s"}:{" "}
        <span className="text-leaf font-medium">{verifiedCount} verified</span>,{" "}
        <span className="text-gray-400">{unverified.length} unverified</span>
      </p>

      {unverifiedOther.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer text-gray-400 hover:text-ink transition-colors">
            Show unverified emails ({unverifiedOther.length})
          </summary>
          <ul className="mt-3 space-y-1.5 max-h-64 overflow-y-auto">
            {unverifiedOther.map((u, i) => (
              <li key={i} className="flex justify-between gap-4 text-xs text-gray-400 border-b border-pink-pale/50 pb-1.5">
                <span className="truncate">{u.email ?? "(no email on account)"}</span>
                <span className="whitespace-nowrap">{new Date(u.unlockedAt).toLocaleDateString()}</span>
              </li>
            ))}
          </ul>
        </details>
      )}

      {unverifiedAmazon.length > 0 && (
        <details className="text-sm mt-2">
          <summary className="cursor-pointer text-gray-400 hover:text-ink transition-colors">
            Amazon-code unlocks ({unverifiedAmazon.length}) -- expected, not a signal
          </summary>
          <ul className="mt-3 space-y-1.5 max-h-64 overflow-y-auto">
            {unverifiedAmazon.map((u, i) => (
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
