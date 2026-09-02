import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/AppShell";
import ReviewForm from "@/components/ReviewForm";

export default async function LeaveReviewPage({
  searchParams,
}: {
  searchParams: { book?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/account/review");

  const { data: profile } = await supabase
    .from("users")
    .select("nickname, display_name")
    .eq("id", user.id)
    .maybeSingle();

  const defaultName = profile?.nickname ?? profile?.display_name ?? "";

  const { data: books } = await supabase
    .from("books")
    .select("id, slug, title")
    .eq("status", "published")
    .order("sort_order");

  // ?book=<slug> (same query-param convention as the Grove/Circle deep
  // links elsewhere in this app) lets the Journey-page completion
  // prompt arrive with the just-finished book preselected -- resolved
  // against the same list already fetched above, not a second query.
  // Falls back to undefined (ReviewForm's own books[0] default) if the
  // slug doesn't match a published book, e.g. a stale/typo'd link.
  const defaultBookId = books?.find((b) => b.slug === searchParams.book)?.id;

  return (
    <AppShell>
      <main className="max-w-lg mx-auto px-5 py-8">
        <div className="mb-8">
          <Link href="/account" className="text-sm text-gray-400 hover:text-ink transition-colors">
            ← Account
          </Link>
        </div>
        <h1 className="text-3xl mb-1">Leave a review</h1>
        <p className="text-gray-400 mb-8 text-sm">
          Tell other readers what Still Growing has meant to you.
        </p>
        <ReviewForm defaultDisplayName={defaultName} books={books ?? []} defaultBookId={defaultBookId} />
      </main>
    </AppShell>
  );
}
