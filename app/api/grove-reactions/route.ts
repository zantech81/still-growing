import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Mirrors app/api/reactions/route.ts's shape exactly, except: no
// notifyReaction call. Grove reactions are purely statistical (Zan: "no
// need to notify admin or email, its purely statistical") -- there's no
// Grove equivalent of a reflection's author to notify, and deliberately
// no email either, so this is the whole route.
export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const grovePostId = body?.grove_post_id;
  if (!grovePostId) {
    return NextResponse.json({ error: "Missing grove_post_id" }, { status: 400 });
  }

  const { error } = await supabase
    .from("grove_reactions")
    .insert({ user_id: user.id, grove_post_id: grovePostId });

  if (error) {
    // 23505 = unique violation: user already reacted. Treat as success.
    if (error.code !== "23505") {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  // Return the authoritative hearts_count from the DB (trigger has already run
  // synchronously within the same transaction, so this value is accurate).
  const { data: post } = await supabase
    .from("grove_posts")
    .select("hearts_count")
    .eq("id", grovePostId)
    .single();

  return NextResponse.json({ ok: true, hearts_count: post?.hearts_count ?? null });
}

export async function DELETE(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const grovePostId = body?.grove_post_id;
  if (!grovePostId) {
    return NextResponse.json({ error: "Missing grove_post_id" }, { status: 400 });
  }

  const { error } = await supabase
    .from("grove_reactions")
    .delete()
    .eq("user_id", user.id)
    .eq("grove_post_id", grovePostId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: post } = await supabase
    .from("grove_posts")
    .select("hearts_count")
    .eq("id", grovePostId)
    .single();

  return NextResponse.json({ ok: true, hearts_count: post?.hearts_count ?? null });
}
