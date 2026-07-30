import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(_request: Request, { params }: { params: { reflectionId: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error } = await supabase
    .from("profile_pins")
    .delete()
    .eq("user_id", user.id)
    .eq("reflection_id", params.reflectionId);

  if (error) {
    return NextResponse.json({ error: "Something went wrong. Try again." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

// Swaps this pin's display_order with its immediate neighbor in the
// caller's own pin order. A no-op (not an error) at either edge, same
// as most reorder-by-one-step UIs.
export async function PATCH(request: Request, { params }: { params: { reflectionId: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const direction = body?.direction;
  if (direction !== "up" && direction !== "down") {
    return NextResponse.json({ error: "Missing direction" }, { status: 400 });
  }

  const { data: pins } = await supabase
    .from("profile_pins")
    .select("id, reflection_id, display_order")
    .eq("user_id", user.id)
    .order("display_order", { ascending: true });

  if (!pins) {
    return NextResponse.json({ error: "No pins found" }, { status: 404 });
  }

  const index = pins.findIndex((p) => p.reflection_id === params.reflectionId);
  if (index === -1) {
    return NextResponse.json({ error: "Pin not found" }, { status: 404 });
  }

  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= pins.length) {
    return NextResponse.json({ ok: true });
  }

  const current = pins[index];
  const swapWith = pins[swapIndex];

  const [{ error: err1 }, { error: err2 }] = await Promise.all([
    supabase.from("profile_pins").update({ display_order: swapWith.display_order }).eq("id", current.id),
    supabase.from("profile_pins").update({ display_order: current.display_order }).eq("id", swapWith.id),
  ]);

  if (err1 || err2) {
    return NextResponse.json({ error: "Something went wrong. Try again." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
