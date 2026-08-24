import { NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
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

    // Sync to Systeme.io marketing list on first sign-in. Not awaited --
    // this can take up to ~10s worst case (two sequential 5s-timeout API
    // calls in syncSystemeContact), which was stacking in front of the
    // redirect on exactly the reader's first impression of the app.
    // waitUntil (not a bare un-awaited call) is required for this to
    // reliably finish: Vercel's Node.js serverless functions aren't
    // guaranteed to keep running background work after the response is
    // sent, they can freeze the execution context immediately -- this
    // tells the platform to keep the function alive until the promise
    // settles, without making the reader wait on it. Safe regardless: the
    // function itself already never throws (see its own comment) and is
    // idempotent (checks systeme_contact_id first), so a rare dropped run
    // just retries clean on the user's next sign-in.
    if (session?.user) {
      waitUntil(syncSystemeContact(session.user.id, session.user.email ?? ""));
    }
  }

  // Routed through a brief branded loading page rather than straight to
  // `next` -- see app/auth/welcome/page.tsx (cosmetic, for marketing video
  // footage; not doing anything with the extra time).
  return NextResponse.redirect(`${origin}/auth/welcome?next=${encodeURIComponent(next)}`);
}
