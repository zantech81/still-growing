import { createAdminClient } from "@/lib/supabase/admin";

// Revokes ongoing access after a refund on the 7-day money-back guarantee
// (2026-09-15) -- see app/api/webhooks/systeme/route.ts. Deliberately does
// NOT touch reflections, badges, or user_books progress: the guarantee is
// "stop future access," not a clawback of anything already read/watched.
//
// Only book_unlocks needs deleting to achieve that: both the chapter-page
// gate (app/[book]/[chapter]/page.tsx's `if (!bookUnlock) redirect(...)`,
// which is what stands between a reader and ClaimChapter's badge-claim
// button) and the Circle's own read/post gate (app/circle/page.tsx's
// `unlocks.length === 0` check) key off book_unlocks existing for the
// user, not off `purchases` -- that table has never been a gate anywhere
// in this app (lib/purchases.ts's isVerifiedBuyer is explicitly advisory
// only). Once the row is gone, both close together with no separate
// Circle-specific code needed.
export type RevocationOutcome =
  | { kind: "revoked"; bookTitle: string; bookId: string }
  | { kind: "skipped_gift" }
  | { kind: "no_matching_user" }
  | { kind: "no_unlock_found" }
  | { kind: "error"; message: string };

// Gift purchases are deliberately excluded: the refunded email here is
// the GIFT BUYER's, not whichever separate person actually redeemed the
// gift code (this app has no table linking a gift purchase to the
// redeemer's account -- see 0046_purchases_product_tag.sql, which only
// tags which funnel a purchase came from, nothing more). Auto-revoking by
// email here would either do nothing (the buyer never made their own
// reader account) or, worse, wrongly revoke a buyer's OWN separate,
// legitimately-unlocked copy for a refund that was never about their own
// access. Left to the admin-email backstop (see lib/sendgrid.ts's
// refundNotificationEmail*) to handle by hand.
function isGiftPurchase(productTag: string | null): boolean {
  return !!productTag?.toLowerCase().includes("gift");
}

// Hardcoded to the "baby" book: this refund program is specifically for
// "Life Lessons from a Baby" (the $14.99 book) and its $3.99 workbook
// bump -- the workbook itself has no separate in-app gate to revoke (it's
// delivered as a standalone download outside this app), so the book's own
// book_unlocks row is the only access this needs to touch. Revisit when a
// second published book makes "which book was this order for" need an
// actual mapping instead of an assumption.
const REFUND_BOOK_SLUG = "baby";

export async function revokeAccessForRefund(
  email: string | null,
  productTag: string | null
): Promise<RevocationOutcome> {
  if (isGiftPurchase(productTag)) {
    return { kind: "skipped_gift" };
  }
  if (!email) {
    return { kind: "no_matching_user" };
  }

  const admin = createAdminClient();

  const { data: user, error: userError } = await admin
    .from("users")
    .select("id")
    .ilike("email", email)
    .maybeSingle();
  if (userError) return { kind: "error", message: userError.message };
  if (!user) return { kind: "no_matching_user" };

  const { data: book, error: bookError } = await admin
    .from("books")
    .select("id, title")
    .eq("slug", REFUND_BOOK_SLUG)
    .maybeSingle();
  if (bookError) return { kind: "error", message: bookError.message };
  if (!book) return { kind: "error", message: `book slug "${REFUND_BOOK_SLUG}" not found` };

  const { data: deleted, error: deleteError } = await admin
    .from("book_unlocks")
    .delete()
    .eq("user_id", user.id)
    .eq("book_id", book.id)
    .select("id");
  if (deleteError) return { kind: "error", message: deleteError.message };
  if (!deleted || deleted.length === 0) return { kind: "no_unlock_found" };

  return { kind: "revoked", bookTitle: book.title, bookId: book.id };
}

// Plain-English status line substituted into the refund-notification
// email's {{revocationStatus}} -- kept out of the admin-editable template
// copy itself since it's dynamic per event, same reasoning as
// unlockClusterAlertEmailHtml's bookTitle/unverifiedCount vars.
export function describeRevocationOutcome(outcome: RevocationOutcome): string {
  switch (outcome.kind) {
    case "revoked":
      return `Access to ${outcome.bookTitle} was automatically revoked for this reader.`;
    case "skipped_gift":
      return "This was a gift purchase -- access was NOT automatically revoked, since gift purchases can't be reliably linked to whichever account actually redeemed the code. Check manually if the recipient's access needs revoking.";
    case "no_matching_user":
      return "No Still Growing account was found for this email -- nothing to revoke automatically. If the buyer redeemed under a different email, you may need to check manually.";
    case "no_unlock_found":
      return "A matching account was found, but it had no active unlock for this book -- nothing to revoke.";
    case "error":
      return `Automatic revocation failed unexpectedly (${outcome.message}) -- please check and revoke access manually.`;
  }
}
