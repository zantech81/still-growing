import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { notifyBookLaunch } from "@/lib/notifications";

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify the caller is an admin before sending any emails.
  const { data: profile } = await supabase
    .from("users")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const bookId = body?.bookId;
  if (!bookId) {
    return NextResponse.json({ error: "Missing bookId" }, { status: 400 });
  }

  await notifyBookLaunch(bookId);

  return NextResponse.json({ ok: true });
}
