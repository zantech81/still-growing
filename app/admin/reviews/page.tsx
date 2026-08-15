import { createClient } from "@/lib/supabase/server";
import ReviewsAdminList from "@/components/admin/ReviewsAdminList";

// No auth check here: app/admin/layout.tsx already gates every route under
// /admin to a signed-in admin, same as app/admin/circle/page.tsx.
export default async function AdminReviewsPage() {
  const supabase = createClient();

  const { data: rawReviews } = await supabase
    .from("reviews")
    .select(
      "id, rating, text, display_name_override, status, is_featured, created_at, users(nickname, display_name, email)"
    )
    .order("created_at", { ascending: false });

  type Review = {
    id: string;
    rating: number;
    text: string;
    display_name_override: string | null;
    status: "pending" | "approved" | "rejected";
    is_featured: boolean;
    created_at: string;
    users: { nickname: string | null; display_name: string | null; email: string | null } | null;
  };

  const reviews = (rawReviews ?? []) as unknown as Review[];
  const pendingCount = reviews.filter((r) => r.status === "pending").length;

  return (
    <div>
      <h1 className="text-3xl font-display text-plum mb-2">Reviews</h1>
      <p className="text-sm text-gray-400 mb-8">
        Reader-submitted reviews · {reviews.length} total
        {pendingCount > 0 && `, ${pendingCount} pending`}
      </p>
      <ReviewsAdminList reviews={reviews} />
    </div>
  );
}
