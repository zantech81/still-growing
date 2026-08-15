import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Public by design, no auth: this is what app/reviews/page.tsx's server
// render and public/embeds/reviews-widget.js's cross-origin fetch (from
// the Systeme.io sales page) both call. Uses the service-role client
// (lib/supabase/admin.ts) rather than the cookie-based one, same reasoning
// as app/api/og/*/route.ts and /r/[shareId] -- there's no RLS "using
// (true)" select policy on reviews at all (see 0044_reviews.sql), on
// purpose, so this route is the only path to public review data, and it
// selects only the columns that are actually safe to publish.
export async function GET() {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("reviews")
    .select("id, rating, text, display_name_override, created_at, is_featured")
    .eq("status", "approved")
    .order("is_featured", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }

  // Access-Control-Allow-Origin: * is intentional, not an oversight -- this
  // endpoint is meant to be embedded cross-origin on the Systeme.io sales
  // page (see public/embeds/reviews-widget.js), and every column returned
  // above is already public-safe (never user_id/reviewed_by, never a
  // non-approved row).
  return NextResponse.json(
    { reviews: data ?? [] },
    { headers: { "Access-Control-Allow-Origin": "*" } }
  );
}
