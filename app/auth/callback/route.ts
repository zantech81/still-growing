import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Completes sign-in for Google OAuth and email magic links, then sends
// the reader wherever they were headed — including straight into a
// /baby/ch4 deep link if that's what brought them here.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/library";

  if (code) {
    const supabase = createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
