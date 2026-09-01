import { createAdminClient } from "@/lib/supabase/admin";
import { getCompletedPurchaseEmailSet } from "@/lib/purchases";

export type BookUnlockCluster = {
  id: string;
  title: string;
  unverifiedCount: number;
};

// Trailing-24h unverified-unlock count per published book -- the one
// computation both the daily cron alert (app/api/cron/unlock-alert) and
// the admin dashboard's live banner (app/admin/page.tsx) share, so the
// two can never silently disagree about what counts as "abnormal right
// now." book_unlocks has no admin-read RLS policy (only "users see own
// book unlocks", 0007_book_redemption_codes.sql), so this needs the
// admin client to see every unlock across every reader, same reason
// app/admin/books/[id]/page.tsx already does for
// UnlockVerificationSummary.
export async function getUnverifiedUnlockClusters(): Promise<BookUnlockCluster[]> {
  const supabase = createAdminClient();

  const [{ data: books }, verifiedEmails] = await Promise.all([
    supabase.from("books").select("id, title").eq("status", "published"),
    getCompletedPurchaseEmailSet(),
  ]);

  const cutoff = new Date(Date.now() - 24 * 3600 * 1000).toISOString();

  const results: BookUnlockCluster[] = [];
  for (const book of books ?? []) {
    const { data: unlockRows } = await supabase
      .from("book_unlocks")
      .select("users(email)")
      .eq("book_id", book.id)
      .gte("unlocked_at", cutoff);

    // Same defensive array-or-object handling as
    // app/admin/books/[id]/page.tsx's identical join -- Supabase's
    // inferred type for a to-one embed isn't reliably just an object.
    const unverifiedCount = (unlockRows ?? []).filter((row) => {
      const userRow = Array.isArray(row.users) ? row.users[0] : row.users;
      const email = (userRow?.email as string | undefined)?.toLowerCase().trim();
      return !email || !verifiedEmails.has(email);
    }).length;

    results.push({ id: book.id, title: book.title, unverifiedCount });
  }

  return results;
}
