import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { notifyReaction } from "@/lib/notifications";

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const reflectionId = body?.reflection_id;
  if (!reflectionId) {
    return NextResponse.json({ error: "Missing reflection_id" }, { status: 400 });
  }

  const { error } = await supabase
    .from("reactions")
    .insert({ user_id: user.id, reflection_id: reflectionId });

  if (error) {
    // 23505 = unique violation: user already reacted. Treat as success.
    if (error.code !== "23505") {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  } else {
    // Only notify on a fresh reaction, not a duplicate.
    await notifyReaction(reflectionId, user.id);
  }

  return NextResponse.json({ ok: true });
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
  const reflectionId = body?.reflection_id;
  if (!reflectionId) {
    return NextResponse.json({ error: "Missing reflection_id" }, { status: 400 });
  }

  const { error } = await supabase
    .from("reactions")
    .delete()
    .eq("user_id", user.id)
    .eq("reflection_id", reflectionId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
