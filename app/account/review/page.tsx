import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/AppShell";
import ReviewForm from "@/components/ReviewForm";

export default async function LeaveReviewPage() {
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
        <ReviewForm defaultDisplayName={defaultName} />
      </main>
    </AppShell>
  );
}
