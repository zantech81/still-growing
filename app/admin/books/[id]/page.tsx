import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCompletedPurchaseEmailSet } from "@/lib/purchases";
import BookForm from "@/components/admin/BookForm";
import UnlockVerificationSummary from "@/components/admin/UnlockVerificationSummary";

export default async function EditBookPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const [{ data: book }, { data: collections }] = await Promise.all([
    supabase
      .from("books")
      .select("id, collection_id, title, subtitle, description, slug, cover_image_url, banner_image_url, share_banner_image_url, sales_page_url, redemption_code, status, reveal_details, placeholder_text, gamification_config")
      .eq("id", params.id)
      .single(),
    supabase.from("collections").select("id, name").order("name"),
  ]);

  if (!book) notFound();

  // book_unlocks' own RLS only allows a reader to see their own row (see
  // "users see own book unlocks", 0007_book_redemption_codes.sql) -- no
  // admin-read policy exists for it, unlike purchases -- so this needs
  // the admin client to see every unlock for the book, same as the
  // cron/webhook routes use it. Joined against a single batch email Set
  // (lib/purchases.ts) rather than one query per unlock.
  const [{ data: unlockRows }, verifiedEmails] = await Promise.all([
    createAdminClient()
      .from("book_unlocks")
      .select("unlocked_at, users(email)")
      .eq("book_id", params.id)
      .order("unlocked_at", { ascending: false }),
    getCompletedPurchaseEmailSet(),
  ]);

  const unlocks = (unlockRows ?? []).map((row) => {
    const userRow = Array.isArray(row.users) ? row.users[0] : row.users;
    const email = (userRow?.email as string | undefined) ?? null;
    return {
      email,
      unlockedAt: row.unlocked_at as string,
      verified: !!email && verifiedEmails.has(email.toLowerCase().trim()),
    };
  });

  return (
    <div>
      <h1 className="text-3xl font-display text-plum mb-2">Edit book</h1>
      <p className="text-sm text-gray-400 mb-8">/{book.slug}</p>
      <UnlockVerificationSummary unlocks={unlocks} />
      <BookForm collections={collections ?? []} book={book} />
    </div>
  );
}
