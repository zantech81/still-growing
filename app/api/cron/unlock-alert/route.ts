import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUnverifiedUnlockClusters } from "@/lib/unlockAlerts";
import { sendEmail, unlockClusterAlertEmailHtml, unlockClusterAlertEmailText } from "@/lib/sendgrid";

export const runtime = "nodejs";

// No existing "send alerts to the admin" convention/env var found in this
// project (SUPPORT_EMAIL is a reader-facing contact address shown in
// app/privacy/page.tsx and LockedBookCard.tsx, not an internal-alert
// recipient) -- this is the same address privacy.tsx already hardcodes
// as the one people reach the team at, reused here rather than adding a
// new env var for a single recipient.
const ALERT_RECIPIENT = "admin@stillgrowing.co";

// Daily detector for an abnormal burst of *new* unverified unlocks on a
// published book -- the leading signal for a leaked shared redemption
// code (0007_book_redemption_codes.sql: one code per book, no per-buyer
// distinction, so a leaked redemption is indistinguishable from a
// legitimate one at the row level). "Unverified" alone is deliberately
// NOT treated as a piracy signal -- see lib/unlockAlerts.ts and
// components/admin/UnlockVerificationSummary.tsx's own comments: Amazon
// KDP buyers are *permanently* unverified (no webhook, no shared email),
// gift recipients redeem under their own email while the purchases row
// is under the gifter's, and ordinary Google/Apple sign-in produces
// checkout/sign-in email mismatches. All of that is a steady trickle; a
// real leak produces an unusual spike in a short window. This route only
// ever detects and emails -- it never touches redemption itself
// (app/api/redeem/route.ts is untouched) and never blocks anything.
//
// Edge-triggered, not level-triggered: books.unlock_alert_active (see
// 0059_unlock_cluster_alert.sql) tracks whether a book is CURRENTLY in
// an alerted state. An email only sends on the transition into that
// state; while it stays over threshold on subsequent days, no repeat
// email sends; once a later day's count drops back under threshold, the
// flag clears silently (no "all clear" email) so the next real crossing
// can alert again.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("Authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  const [{ data: settings }, { data: books }, clusters] = await Promise.all([
    supabase.from("site_settings").select("unlock_alert_threshold").eq("id", 1).maybeSingle(),
    supabase.from("books").select("id, unlock_alert_active").eq("status", "published"),
    getUnverifiedUnlockClusters(),
  ]);

  const threshold = settings?.unlock_alert_threshold ?? 10;
  const activeById = new Map((books ?? []).map((b) => [b.id, b.unlock_alert_active as boolean]));

  let checked = 0;
  let alerted = 0;
  let cleared = 0;

  for (const cluster of clusters) {
    checked++;
    const wasActive = activeById.get(cluster.id) ?? false;
    const isAbnormal = cluster.unverifiedCount >= threshold;

    if (isAbnormal && !wasActive) {
      const ok = await sendEmail({
        to: ALERT_RECIPIENT,
        subject: `Unusual unlock activity: "${cluster.title}"`,
        html: unlockClusterAlertEmailHtml(cluster.title, cluster.unverifiedCount, cluster.id),
        text: unlockClusterAlertEmailText(cluster.title, cluster.unverifiedCount, cluster.id),
      });

      await supabase
        .from("books")
        .update({
          unlock_alert_active: true,
          ...(ok ? { last_unlock_alert_sent_at: new Date().toISOString() } : {}),
        })
        .eq("id", cluster.id);

      alerted++;
    } else if (!isAbnormal && wasActive) {
      await supabase.from("books").update({ unlock_alert_active: false }).eq("id", cluster.id);
      cleared++;
    }
  }

  console.log(
    `[cron/unlock-alert] checked ${checked} book(s), ${alerted} newly alerted, ${cleared} cleared, threshold ${threshold}`
  );
  return NextResponse.json({ checked, alerted, cleared, threshold });
}
