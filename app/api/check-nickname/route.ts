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
  // public_profiles, not users directly: this needs to see every user's
  // nickname regardless of who's asking, and public.users' own RLS is now
  // scoped to "own row or admin" (see 0033_users_rls_column_scoping.sql).
  const query = supabase
    .from("public_profiles")
    .select("id")
    .filter("nickname", "ilike", nickname);

  if (user) {
    query.neq("id", user.id);
  }

  const { data } = await query.maybeSingle();

  return NextResponse.json({ available: !data });
}
