import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { moderateReflection } from "@/lib/moderation";
import { CONTACT_INFO_MESSAGE, HARMFUL_MESSAGE, productFeedbackMessage } from "@/lib/moderationMessages";

const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

type GamConfig = { reflection?: { max_length?: number } };

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

  // Honeypot: real users never see or fill this field. Bots that fill every
  // field get a fake success with nothing persisted, so there's no feedback
  // that tips them off.
  if (typeof body.website === "string" && body.website.trim() !== "") {
    return NextResponse.json({ ok: true, reflection: null });
  }

  const { chapter_id, book_id, chapter_number, text, share_to_circle, allow_external_share, is_claim, unlock_code } = body;
  if (
    typeof chapter_id !== "string" ||
    typeof book_id !== "string" ||
    typeof chapter_number !== "number" ||
    typeof text !== "string"
  ) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const trimmed = text.trim();
  if (!trimmed) {
    return NextResponse.json({ error: "Write your reflection first." }, { status: 400 });
  }

  const { data: book } = await supabase
    .from("books")
    .select("gamification_config")
    .eq("id", book_id)
    .single();

  const maxLength = (book?.gamification_config as GamConfig | null)?.reflection?.max_length ?? 350;
  if (trimmed.length > maxLength) {
    return NextResponse.json(
      { error: `Reflection must be ${maxLength} characters or fewer (currently ${trimmed.length}).` },
      { status: 400 }
    );
  }

  // Only the initial claim (not "share another reflection") unlocks a badge,
  // so only that call needs to prove it has the chapter's code. Fetched and
  // compared server-side - never exposed to the client (same principle as
  // the book redemption code in /api/redeem).
  if (is_claim) {
    const { data: chapterRow } = await supabase
      .from("chapters")
      .select("unlock_code")
      .eq("id", chapter_id)
      .single();

    if (chapterRow?.unlock_code) {
      const submitted = typeof unlock_code === "string" ? unlock_code.trim() : "";
      if (!submitted || chapterRow.unlock_code.toUpperCase() !== submitted.toUpperCase()) {
        return NextResponse.json(
          { error: "That password doesn't match. Check your chapter for the correct password.", code: "invalid_unlock_code" },
          { status: 400 }
        );
      }
    }
  }

  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
  const { count: recentCount } = await supabase
    .from("reflections")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", windowStart);

  if ((recentCount ?? 0) >= RATE_LIMIT_MAX) {
    return NextResponse.json(
      { error: "You're posting a bit fast. Please wait a few minutes and try again." },
      { status: 429 }
    );
  }

  const verdict = moderateReflection(trimmed);
  if (verdict.type === "blocked_contact") {
    return NextResponse.json({ error: CONTACT_INFO_MESSAGE, code: "contact_info" }, { status: 400 });
  }
  if (verdict.type === "blocked_harmful") {
    return NextResponse.json({ error: HARMFUL_MESSAGE, code: "harmful" }, { status: 400 });
  }
  if (verdict.type === "blocked_product") {
    return NextResponse.json(
      { error: productFeedbackMessage(), code: "product_feedback" },
      { status: 400 }
    );
  }

  const isSpam = verdict.type === "spam";
  const isHidden = isSpam ? true : !share_to_circle;
  // Only meaningful when the reflection is actually shared to the Circle;
  // a private reflection can never carry external-share consent,
  // regardless of what the client sends. Enforced here, not just left to
  // the UI disabling the checkbox (see also app/api/shares/route.ts,
  // which re-checks this at share-creation time).
  const allowExternalShare = !isHidden && !!allow_external_share;

  const { data: inserted, error } = await supabase
    .from("reflections")
    .insert({
      user_id: user.id,
      chapter_id,
      book_id,
      chapter_number,
      text: trimmed,
      is_hidden: isHidden,
      flag_reason: isSpam ? "spam" : null,
      allow_external_share: allowExternalShare,
    })
    .select("id, text, is_hidden, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: "Something went wrong. Try again." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, reflection: inserted, flagged: isSpam });
}
