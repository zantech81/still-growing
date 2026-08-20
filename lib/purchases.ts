import { createAdminClient } from "@/lib/supabase/admin";

// Whether an email matches a completed purchase recorded from Systeme.io's
// webhook (see app/api/webhooks/systeme/route.ts, purchases table in
// 0045_purchases.sql). Used only to decide whether to show the "verified
// buyer" badge on a public profile (app/u/[userId]/page.tsx) -- this is a
// positive-only signal (like a platform verified checkmark), never a
// gate: redemption via the shared book code still works regardless of
// this check, per the deliberate honor-system decision. A refunded
// purchase (status != 'completed') correctly stops matching here, since
// this queries live at render time rather than caching a flag from
// whenever the book was originally redeemed -- so the badge also
// naturally disappears if a purchase is later refunded, and naturally
// appears if the webhook event for a genuine sale lands a little after
// the buyer already redeemed their code.
//
// Case-insensitive: Systeme.io and this app's own sign-up flow don't
// necessarily normalize email casing the same way.
export async function isVerifiedBuyer(email: string | null | undefined): Promise<boolean> {
  if (!email) return false;

  const admin = createAdminClient();
  const { data } = await admin
    .from("purchases")
    .select("id")
    .ilike("email", email)
    .eq("status", "completed")
    .limit(1)
    .maybeSingle();

  return !!data;
}

// Batch version for the admin unlock-verification summary
// (components/admin/UnlockVerificationSummary.tsx) -- fetches every
// completed-purchase email once as a lowercased Set, rather than doing
// one query per unlocked reader (which is how isVerifiedBuyer() above is
// used, fine for a single profile page but would be an N+1 query pattern
// against a book with hundreds of unlocks). Callers should lowercase
// their own emails before checking Set membership (Set.has doesn't do
// isVerifiedBuyer()'s case-insensitive ilike matching).
export async function getCompletedPurchaseEmailSet(): Promise<Set<string>> {
  const admin = createAdminClient();
  const { data } = await admin.from("purchases").select("email").eq("status", "completed");

  return new Set(
    (data ?? [])
      .map((row) => (row.email as string | null)?.toLowerCase().trim())
      .filter((email): email is string => !!email)
  );
}
