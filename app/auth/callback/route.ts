import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { syncSystemeContact } from "@/lib/systeme";

// Completes sign-in for Google OAuth and email magic links, then sends
// the reader wherever they were headed, including straight into a
// /baby/ch4 deep link if that's what brought them here.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/library";

  if (code) {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.exchangeCodeForSession(code);

    // Sync to Systeme.io marketing list on first sign-in.
    // Errors are caught inside syncSystemeContact and never block the redirect.
    if (session?.user) {
      await syncSystemeContact(session.user.id, session.user.email ?? "");
    }
  }

  return NextResponse.redirect(`${origin}${next}`);
}
