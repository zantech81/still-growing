import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Pinning a reflection is enforced almost entirely at the DB layer, not
// here: the "users pin own shared reflections" RLS policy checks
// ownership + is_hidden = false, and the profile_pins_max_three trigger
// enforces the 3-pin cap (see 0038_profile_pins.sql). This route's job
// is just to compute the next display_order and translate the two
// Postgres error codes those enforce into copy a reader can act on.
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
  if (typeof reflectionId !== "string") {
    return NextResponse.json({ error: "Missing reflection_id" }, { status: 400 });
  }

  const { count } = await supabase
    .from("profile_pins")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  const { error } = await supabase
    .from("profile_pins")
    .insert({ user_id: user.id, reflection_id: reflectionId, display_order: count ?? 0 });

  if (error) {
    if (error.code === "23505") {
      // Already pinned: idempotent success, not an error.
      return NextResponse.json({ ok: true });
    }
    if (error.code === "P0001") {
      return NextResponse.json(
        { error: "You can only pin up to 3 reflections. Unpin one first.", code: "max_pins" },
        { status: 400 }
      );
    }
    if (error.code === "42501") {
      return NextResponse.json(
        { error: "You can only pin your own reflections that are currently shared to the Circle.", code: "not_pinnable" },
        { status: 403 }
      );
    }
    return NextResponse.json({ error: "Something went wrong. Try again." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
