import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// super_admin-only, matching suspend-user/delete-user's rigor (see
// 0053_super_admin.sql). Has to go through the service-role client
// regardless: 0052_lock_down_users_self_update.sql revoked the blanket
// UPDATE grant on public.users from authenticated entirely, so even a
// super_admin's own session can no longer write is_admin directly --
// that's the point of that fix, not an oversight here.
export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: caller } = await supabase.from("users").select("super_admin").eq("id", user.id).single();
  if (!caller?.super_admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const targetId = body?.user_id;
  const isAdmin = body?.is_admin;
  if (!targetId || typeof isAdmin !== "boolean") {
    return NextResponse.json({ error: "Missing user_id or is_admin" }, { status: 400 });
  }
  // Hard block, enforced server-side -- same reasoning as suspend-user/
  // delete-user's self-target block: a super_admin demoting themselves
  // by accident (especially the only super_admin) has no recovery path
  // short of direct DB access.
  if (targetId === user.id) {
    return NextResponse.json({ error: "You can't change your own admin status." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin.from("users").update({ is_admin: isAdmin }).eq("id", targetId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
