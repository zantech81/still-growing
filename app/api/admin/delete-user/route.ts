import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Hard, irreversible delete. Every user-linked table (user_books,
// user_badges, reflections, reactions, notifications, shares,
// connections, profile_pins, self_harm_flags, reviews) already cascades
// from public.users, which cascades from auth.users -- confirmed
// empirically during the 2026-08-22 manual lbbmontessori.socmed@gmail.com
// cleanup, and re-confirmed here. Deliberately NOT touching
// public.purchases: it has no foreign key to users at all (keyed by
// email only, written by the Systeme.io webhook), so a financial record
// survives account deletion by construction -- no manual cleanup step
// needed or wanted for it.
export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // super_admin-only as of 2026-08-28 (The Grove / super-admin tier
  // work): a regular admin (is_admin true, super_admin false) no longer
  // gets this. See 0053_super_admin.sql.
  const { data: caller } = await supabase.from("users").select("super_admin").eq("id", user.id).single();
  if (!caller?.super_admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const targetId = body?.user_id;
  if (!targetId) {
    return NextResponse.json({ error: "Missing user_id" }, { status: 400 });
  }
  // Hard block, enforced server-side -- see suspend-user/route.ts's
  // matching comment on why this is self-only, not admin-target.
  if (targetId === user.id) {
    return NextResponse.json({ error: "You can't delete your own account." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(targetId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
