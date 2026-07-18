import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const rootedForId = body?.rooted_for_id;
  // Optional: which book's Circle context this "Root for" click happened
  // in (see supabase/migrations/0031_connections_book_id.sql). Data
  // capture only right now -- callers that don't send it (or send an
  // invalid value) still work exactly as before, just without provenance.
  const bookId = typeof body?.book_id === "string" ? body.book_id : null;
  if (!rootedForId) {
    return NextResponse.json({ error: "Missing rooted_for_id" }, { status: 400 });
  }
  // The DB check constraint already blocks this, but a friendlier 400 here
  // avoids surfacing a raw Postgres constraint-violation message.
  if (rootedForId === user.id) {
    return NextResponse.json({ error: "You can't root for yourself." }, { status: 400 });
  }

  const { error } = await supabase
    .from("connections")
    .insert({ rooter_id: user.id, rooted_for_id: rootedForId, book_id: bookId });

  if (error) {
    // 23505 = unique violation: already rooting for this person. Treat as success.
    if (error.code !== "23505") {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const rootedForId = body?.rooted_for_id;
  if (!rootedForId) {
    return NextResponse.json({ error: "Missing rooted_for_id" }, { status: 400 });
  }

  const { error } = await supabase
    .from("connections")
    .delete()
    .eq("rooter_id", user.id)
    .eq("rooted_for_id", rootedForId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
