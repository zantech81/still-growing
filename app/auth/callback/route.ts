import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Completes sign-in for Google OAuth and email magic links, then sends
// the reader wherever they were headed, including straight into a
// /baby/ch4 deep link if that's what brought them here.
//
// Does NOT sync to Systeme.io here anymore -- that used to run in this
// route (awaited, then briefly via @vercel/functions' waitUntil) but both
// approaches were confirmed unreliable: awaiting it stacked up to ~10s of
// dead time in front of the redirect on a genuine first sign-in, and
// waitUntil was empirically proven (2026-08-25, real production magic-link
// test) to never actually complete the background work at all -- no log
// output, no DB write, even 30+ seconds later, on a Vercel Node.js
// serverless function on this project's plan. See
// app/auth/welcome/page.tsx's client-side fetch to
// app/api/auth/sync-contact/route.ts instead: a real client-initiated
// request with `keepalive: true` survives the page's own redirect, with
// none of the "does the platform actually keep running this after the
// response is sent" uncertainty a same-request background task has.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/library";

  if (code) {
    const supabase = createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  // Routed through a brief branded loading page rather than straight to
  // `next` -- see app/auth/welcome/page.tsx (cosmetic, for marketing video
  // footage; not doing anything with the extra time).
  return NextResponse.redirect(`${origin}/auth/welcome?next=${encodeURIComponent(next)}`);
}
