import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { syncSystemeContact } from "@/lib/systeme";
import { perfLog } from "@/lib/perfLog";

// Fired client-side, un-awaited, from app/auth/welcome/page.tsx (with
// `keepalive: true` so the request survives that page's own 1s-later
// redirect) -- moved out of app/auth/callback/route.ts, where awaiting it
// blocked the post-login redirect and a Vercel-`waitUntil`-wrapped
// background call was confirmed not to reliably run at all. This route
// runs as a completely normal, fully-lived request/response cycle instead,
// with none of that uncertainty: the browser is genuinely waiting on it
// (even though the page doesn't visually block for it), so there's no
// "does the platform keep this running after the response is sent"
// question to answer.
//
// Derives the user from the request's own session cookie rather than
// requiring the client to pass an id/email -- app/auth/welcome/page.tsx
// only fires this after its own session check has settled, so the cookie
// is already in place by the time this request lands (see that page's
// comments for why that ordering has to be explicit, not assumed).
export async function POST() {
  // TEMP timing instrumentation -- 2026-08-27 perf investigation, remove
  // once the ~5s post-login gap is root-caused. Fire-and-forget from the
  // client (keepalive, unawaited), so this shouldn't be on the critical
  // path -- logged to confirm that assumption rather than trust it.
  const t0 = Date.now();
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    // Never throws (see its own comment) and is idempotent (checks
    // systeme_contact_id first), so nothing further to guard here.
    await syncSystemeContact(user.id, user.email ?? "");
  }
  await perfLog("/api/auth/sync-contact total", Date.now() - t0);

  return NextResponse.json({ ok: true });
}
