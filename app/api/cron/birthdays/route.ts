import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, birthdayEmailHtml, birthdayEmailText } from "@/lib/sendgrid";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("Authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date();
  const month = today.getMonth() + 1;
  const day = today.getDate();
  const year = today.getFullYear();

  const supabase = createAdminClient();

  const { data: users, error } = await supabase
    .from("users")
    .select("id, email, nickname, display_name, last_birthday_email_year")
    .eq("birth_month", month)
    .eq("birth_day", day)
    .not("email", "is", null);

  if (error) {
    console.error("[cron/birthdays] Query error:", error);
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }

  const eligible = (users ?? []).filter(
    (u) => (u.last_birthday_email_year ?? 0) < year
  );

  let sent = 0;
  let failed = 0;

  for (const user of eligible) {
    const name = user.nickname ?? user.display_name ?? "friend";
    const ok = await sendEmail({
      to: user.email as string,
      subject: `Happy birthday, ${name}!`,
      html: birthdayEmailHtml(name),
      text: birthdayEmailText(name),
    });

    if (ok) {
      await supabase
        .from("users")
        .update({ last_birthday_email_year: year })
        .eq("id", user.id);
      sent++;
    } else {
      failed++;
    }
  }

  console.log(`[cron/birthdays] ${month}/${day}/${year}: ${sent} sent, ${failed} failed, ${eligible.length} eligible`);
  return NextResponse.json({ sent, failed, eligible: eligible.length });
}
