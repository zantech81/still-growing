import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { moderateReflection } from "@/lib/moderation";
import { CONTACT_INFO_MESSAGE, HARMFUL_MESSAGE, productFeedbackMessage } from "@/lib/moderationMessages";

const EDIT_LIMIT = 3;

// Reactions belong to the specific version of text a reader reacted to.
// When an edit actually changes that text, prior reactions no longer
// describe what's on the page, so they're deliberately cleared here as an
// explicit product decision, not a side effect inherited from delete logic.
// Uses the admin client because reactions from OTHER users can't be
// deleted under the edited reflection owner's own session (the "users
// remove own reactions" RLS policy only lets a reactor remove their own row).
//
// NOTE: this is only ever called from the text-edit path below. The
// visibility toggle (app/api/reflections/[id]/visibility/route.ts) never
// calls this function. That separation is deliberate; see the comment at
// the top of that file.
async function clearReactionsOnEdit(reflectionId: string): Promise<void> {
  const admin = createAdminClient();
  await admin.from("reactions").delete().eq("reflection_id", reflectionId);
}

type GamConfig = { reflection?: { max_length?: number } };

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body.text !== "string") {
    return NextResponse.json({ error: "Missing text" }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from("reflections")
    .select("id, user_id, book_id, edit_count, text, flag_reason")
    .eq("id", params.id)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: "Reflection not found" }, { status: 404 });
  }
  if (existing.user_id !== user.id) {
    return NextResponse.json({ error: "You can only edit your own reflections" }, { status: 403 });
  }
  if (existing.edit_count >= EDIT_LIMIT) {
    return NextResponse.json(
      { error: "You've reached the edit limit for this reflection." },
      { status: 400 }
    );
  }

  const trimmed = body.text.trim();
  if (!trimmed) {
    return NextResponse.json({ error: "Write your reflection first." }, { status: 400 });
  }

  const { data: book } = await supabase
    .from("books")
    .select("gamification_config")
    .eq("id", existing.book_id)
    .single();

  const maxLength = (book?.gamification_config as GamConfig | null)?.reflection?.max_length ?? 350;
  if (trimmed.length > maxLength) {
    return NextResponse.json(
      { error: `Reflection must be ${maxLength} characters or fewer (currently ${trimmed.length}).` },
      { status: 400 }
    );
  }

  // Edits go through the same moderation as new submissions. A reflection
  // isn't exempt from the rules just because the original text passed them.
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
  const textChanged = trimmed !== existing.text;

  const update: Record<string, unknown> = {
    text: trimmed,
    edit_count: existing.edit_count + 1,
  };

  if (isSpam) {
    // Mechanical flag: the heuristic filter re-hides on every edit that
    // trips it, same as on creation.
    update.is_hidden = true;
    update.flag_reason = "spam";
  } else if (existing.flag_reason === "spam") {
    // Mechanical flag, mechanical clearing condition: a reflection that was
    // hidden by the spam heuristic and now reads clean is restored
    // automatically, no admin action needed.
    //
    // This does NOT extend to flag_reason === "reported": a reflection
    // hidden by the 3-report threshold represents human judgment an
    // automated filter can't replicate, so it is never auto-restored by an
    // edit, no matter how clean the new text is. Only an admin can unhide
    // it, from /admin/circle. (flag_reason === null, e.g. the author's own
    // "keep private" choice, is likewise left untouched here.)
    update.is_hidden = false;
    update.flag_reason = null;
  }

  if (textChanged) {
    update.hearts_count = 0;
  }

  const { data: updated, error } = await supabase
    .from("reflections")
    .update(update)
    .eq("id", params.id)
    .select("id, text, is_hidden, edit_count, hearts_count, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: "Something went wrong. Try again." }, { status: 500 });
  }

  // Explicit, intentional step (see clearReactionsOnEdit above): only runs
  // when the text actually changed, so a no-op save doesn't wipe reactions
  // for no reason.
  if (textChanged) {
    await clearReactionsOnEdit(params.id);
  }

  return NextResponse.json({ ok: true, reflection: updated, flagged: isSpam });
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: existing } = await supabase
    .from("reflections")
    .select("id, user_id")
    .eq("id", params.id)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: "Reflection not found" }, { status: 404 });
  }
  if (existing.user_id !== user.id) {
    return NextResponse.json({ error: "You can only delete your own reflections" }, { status: 403 });
  }

  const { error } = await supabase.from("reflections").delete().eq("id", params.id);
  if (error) {
    return NextResponse.json({ error: "Something went wrong. Try again." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
