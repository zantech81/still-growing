import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logSelfHarmFlag, moderateReflection } from "@/lib/moderation";
import {
  CONTACT_INFO_MESSAGE,
  HARMFUL_MESSAGE,
  productFeedbackMessage,
  selfHarmMessage,
} from "@/lib/moderationMessages";

// Same default as app/api/reflections/route.ts -- reused, not
// reinvented, so both submission surfaces rate-limit the same way.
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { book_id, rating, text, display_name_override } = body;
  if (typeof text !== "string") {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  if (typeof rating !== "number" || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Rating must be a whole number from 1 to 5." }, { status: 400 });
  }
  if (typeof book_id !== "string" || !book_id) {
    return NextResponse.json({ error: "Choose which book your review is about." }, { status: 400 });
  }

  // Trust nothing from the client beyond "this is a real, published book"
  // -- same reasoning as every other id the client sends here. A review
  // about a draft/coming_soon book (or a book_id that doesn't exist at
  // all) is rejected outright rather than silently accepted.
  const { data: book } = await supabase
    .from("books")
    .select("id")
    .eq("id", book_id)
    .eq("status", "published")
    .maybeSingle();
  if (!book) {
    return NextResponse.json({ error: "That book isn't available for reviews." }, { status: 400 });
  }

  const trimmed = text.trim();
  if (!trimmed) {
    return NextResponse.json({ error: "Write your review first." }, { status: 400 });
  }

  const nameOverride =
    typeof display_name_override === "string" && display_name_override.trim()
      ? display_name_override.trim()
      : null;

  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
  const { count: recentCount } = await supabase
    .from("reviews")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", windowStart);

  if ((recentCount ?? 0) >= RATE_LIMIT_MAX) {
    return NextResponse.json(
      { error: "You're posting a bit fast. Please wait a few minutes and try again." },
      { status: 429 }
    );
  }

  // Same moderation pipeline as a reflection (contact info, chapter
  // passwords -- none apply here so an empty list is passed, profanity,
  // self-harm). A review is public-facing text same as a reflection is,
  // so it gets no lighter a touch.
  const verdict = moderateReflection(trimmed, []);
  if (verdict.type === "blocked_contact") {
    return NextResponse.json({ error: CONTACT_INFO_MESSAGE, code: "contact_info" }, { status: 400 });
  }
  if (verdict.type === "blocked_self_harm") {
    // No chapter context for a review -- book_id/chapter_id stay null,
    // exactly as supabase/migrations/0043_self_harm_flags.sql expects.
    await logSelfHarmFlag(supabase, { userId: user.id, bookId: null, chapterId: null, flaggedText: trimmed });
    return NextResponse.json({ error: selfHarmMessage(), code: "self_harm" }, { status: 400 });
  }
  if (verdict.type === "blocked_harmful") {
    return NextResponse.json({ error: HARMFUL_MESSAGE, code: "harmful" }, { status: 400 });
  }
  if (verdict.type === "blocked_product") {
    // A review that reads as a product complaint isn't wrong to flag the
    // same way a reflection would be -- redirect to support the same way.
    return NextResponse.json(
      { error: productFeedbackMessage(), code: "product_feedback" },
      { status: 400 }
    );
  }

  // status is always forced to "pending" here, never taken from the
  // client -- is_featured/reviewed_at/reviewed_by are admin-only fields
  // (see app/api/reviews/public/route.ts and app/admin/reviews/page.tsx)
  // and are never accepted from this request body at all.
  const { data: inserted, error } = await supabase
    .from("reviews")
    .insert({
      user_id: user.id,
      book_id,
      rating,
      text: trimmed,
      display_name_override: nameOverride,
      status: "pending",
    })
    .select("id, book_id, rating, text, display_name_override, status, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: "Something went wrong. Try again." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, review: inserted });
}
