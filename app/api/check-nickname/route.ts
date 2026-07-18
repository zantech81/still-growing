import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const nickname = searchParams.get("nickname")?.trim();

  if (!nickname) {
    return NextResponse.json({ available: false });
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Check if the nickname is taken by any user other than the current one.
  // ILIKE provides case-insensitive exact match (no wildcards).
  const query = supabase
    .from("users")
    .select("id")
    .filter("nickname", "ilike", nickname);

  if (user) {
    query.neq("id", user.id);
  }

  const { data } = await query.maybeSingle();

  return NextResponse.json({ available: !data });
}
