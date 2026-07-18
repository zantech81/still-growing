import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

  const { data: reflection } = await supabase
    .from("reflections")
    .select("user_id")
    .eq("id", reflectionId)
    .maybeSingle();

  if (!reflection) {
    return NextResponse.json({ error: "Reflection not found" }, { status: 404 });
  }
  if (reflection.user_id === user.id) {
    return NextResponse.json({ error: "You can't report your own reflection" }, { status: 400 });
  }

  const { error } = await supabase
    .from("content_reports")
    .insert({ reporter_id: user.id, reflection_id: reflectionId });

  if (error) {
    // 23505 = unique violation: already reported by this user. Treat as success.
    if (error.code !== "23505") {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
