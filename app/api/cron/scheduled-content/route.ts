import { NextResponse } from "next/server";
import { publishScheduledGrovePosts, updateScheduledAnnouncementStatuses } from "@/lib/notifications";

export const runtime = "nodejs";

// Same CRON_SECRET bearer-auth pattern as /api/cron/birthdays and
// /api/cron/unlock-alert, registered in vercel.json's crons array at the
// same once-daily cadence. Two independent day-boundary sweeps -- run
// together rather than as two separate cron entries since both are cheap,
// closely related "did a date arrive yet" checks, not because they share
// any data dependency (they don't: publishScheduledGrovePosts can insert
// a new scheduled_announcements row, updateScheduledAnnouncementStatuses
// only ever touches existing ones, so running them concurrently rather
// than in series is safe).
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("Authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [{ published, failed }, { started, ended }] = await Promise.all([
    publishScheduledGrovePosts(),
    updateScheduledAnnouncementStatuses(),
  ]);

  console.log(
    `[cron/scheduled-content] ${published} post(s) published (${failed} failed), ${started} announcement(s) started, ${ended} ended`
  );
  return NextResponse.json({ published, failed, started, ended });
}
