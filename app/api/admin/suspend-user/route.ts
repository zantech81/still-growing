import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Reversible: blocks sign-in without touching any data. Confirmed
// empirically (2026-08-26, real disposable account) that Supabase's own
// ban mechanism (auth.users.banned_until, set via
// auth.admin.updateUserById's ban_duration) is checked on every token
// validation, not just at sign-in -- an already-issued, still-valid
// session gets rejected immediately, and a refresh attempt fails too.
// Chosen over a custom is_suspended-checked-in-middleware approach for
// that reason: it's enforced at the Auth layer itself, with no risk of a
// future route forgetting to check a flag. is_suspended/suspended_at on
// public.users (0049_user_suspension.sql) exist purely as the admin UI's
// source of truth for what's already true at the Auth layer -- nothing
// in the app reads them to decide whether to let a request through.
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
  const suspend = body?.suspend;
  if (!targetId || typeof suspend !== "boolean") {
    return NextResponse.json({ error: "Missing user_id or suspend" }, { status: 400 });
  }
  // Hard block, enforced server-side (not just hidden client-side) --
  // the "extra friction, not a hard block" rule from this feature's spec
  // is specifically for acting on OTHER admins, not yourself.
  if (targetId === user.id) {
    return NextResponse.json({ error: "You can't suspend your own account." }, { status: 400 });
  }

  const admin = createAdminClient();

  // GoTrue has no "permanent" ban literal, only a duration -- ~100 years
  // is the common idiom for "indefinite" here. 'none' lifts a ban.
  const { error: authError } = await admin.auth.admin.updateUserById(targetId, {
    ban_duration: suspend ? "876000h" : "none",
  });
  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 500 });
  }

  const { error: dbError } = await admin
    .from("users")
    .update({
      is_suspended: suspend,
      suspended_at: suspend ? new Date().toISOString() : null,
    })
    .eq("id", targetId);
  if (dbError) {
    // The actual sign-in block already succeeded above -- this failing
    // just means the admin UI's badge will be stale until retried, not
    // that the suspension itself didn't take effect.
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
