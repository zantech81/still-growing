import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// GoTrue's own anti-enumeration design means signInWithOtp() returns the
// identical { data: { user: null, session: null }, error: null } response
// whether an email is brand new or already belongs to a Google-only
// account with manual identity linking disabled -- confirmed empirically
// 2026-08-26 against this project's real Auth settings (both cases: 200,
// no error, no email actually sent for the Google case). The login page
// can never tell the two apart from signInWithOtp's return value alone, so
// it checks here first, client-side, before deciding whether to call it.
//
// Small user base (dozens, not thousands) -- a full listUsers() scan is
// fine here; there's no listUsers-by-email lookup in this SDK version.
//
// This does mean anyone can probe an email address's existence/provider
// through this route. That's an inherent tradeoff of the feature itself
// (an honest "use Google instead" message), not an oversight -- the same
// information already leaks through this app's own signup flow (Google
// OAuth itself reveals whether an account exists) and isn't materially
// more sensitive than that.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = body?.email;
  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Missing email" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const normalized = email.trim().toLowerCase();
  const match = data.users.find((u) => u.email?.toLowerCase() === normalized);
  const providers = (match?.app_metadata?.providers as string[] | undefined) ?? [];
  const googleOnly = providers.includes("google") && !providers.includes("email");

  return NextResponse.json({ googleOnly });
}
