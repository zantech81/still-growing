import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { moderateReflection } from "@/lib/moderation";
import {
  CONTACT_INFO_MESSAGE,
  HARMFUL_MESSAGE,
  SPAM_MESSAGE,
  productFeedbackMessage,
} from "@/lib/moderationMessages";

// Visibility-only toggle for a reflection's own author: "Share to Circle"
// (private -> shared) and "Make private" (shared -> private). Deliberately
// separate from the text-edit PATCH handler in ../route.ts:
//   - it never touches `text` or `edit_count` (a visibility change doesn't
//     use up any of the 3 allowed edits)
//   - it never calls clearReactionsOnEdit(), and never resets
//     hearts_count, since reactions belong to the text, not to whether
//     the text is currently visible. Toggling visibility back and forth
//     must never touch either.
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body.share_to_circle !== "boolean") {
    return NextResponse.json({ error: "Missing share_to_circle" }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from("reflections")
    .select("id, user_id, text, is_hidden, flag_reason")
    .eq("id", params.id)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: "Reflection not found" }, { status: 404 });
  }
  if (existing.user_id !== user.id) {
    return NextResponse.json(
      { error: "You can only change the visibility of your own reflections" },
      { status: 403 }
    );
  }
  // Spam/reported are moderation states, not the author's own choice, and
  // stay admin-only (see /admin/circle). This toggle only ever applies to
  // a genuinely private-by-choice or genuinely-shared reflection.
  if (existing.flag_reason === "spam" || existing.flag_reason === "reported") {
    return NextResponse.json(
      { error: "This reflection is under moderation review and can't be changed here." },
      { status: 403 }
    );
  }

  if (body.share_to_circle) {
    if (!existing.is_hidden) {
      // Already shared: idempotent no-op.
      return NextResponse.json({ ok: true, reflection: { id: existing.id, is_hidden: false } });
    }

    // Becoming visible for the first time: run the exact same moderation
    // pipeline a brand-new submission goes through.
    const verdict = moderateReflection(existing.text);
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
    if (verdict.type === "spam") {
      // Correctly flag it for /admin/circle, but it stays private: from
      // this action's point of view, tripping the spam filter is still a
      // rejection, same as the three hard blocks above.
      await supabase.from("reflections").update({ flag_reason: "spam" }).eq("id", params.id);
      return NextResponse.json({ error: SPAM_MESSAGE, code: "spam" }, { status: 400 });
    }

    const { data: updated, error } = await supabase
      .from("reflections")
      .update({ is_hidden: false })
      .eq("id", params.id)
      .select("id, is_hidden")
      .single();

    if (error) {
      return NextResponse.json({ error: "Something went wrong. Try again." }, { status: 500 });
    }
    return NextResponse.json({ ok: true, reflection: updated });
  }

  // Making a shared reflection private again: no moderation needed, this
  // always succeeds.
  const { data: updated, error } = await supabase
    .from("reflections")
    .update({ is_hidden: true, flag_reason: null })
    .eq("id", params.id)
    .select("id, is_hidden")
    .single();

  if (error) {
    return NextResponse.json({ error: "Something went wrong. Try again." }, { status: 500 });
  }
  return NextResponse.json({ ok: true, reflection: updated });
}
