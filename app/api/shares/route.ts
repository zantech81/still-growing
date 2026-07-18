import { NextResponse } from "next/server";
import { customAlphabet } from "nanoid";
import { createClient } from "@/lib/supabase/server";

// Opaque, non-sequential share id, generated here rather than by the database,
// so nothing about it is guessable or enumerable. 16 chars over a 62-char
// alphabet is ~95 bits of entropy, far more than enough that brute-forcing
// another reader's share link isn't a realistic threat.
const generateShareId = customAlphabet(
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
  16
);

const VALID_TYPES = new Set(["badge", "progress", "reflection", "growing_tree"]);
// Types with no single reference row: a progress-grid share summarizes
// the whole book, and a growing_tree share summarizes the whole person
// (see supabase/migrations/0029_connections.sql), so neither points at
// one specific badge/reflection row the way "badge"/"reflection" do.
const TYPES_WITHOUT_REFERENCE = new Set(["progress", "growing_tree"]);

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const type = body?.type;
  const bookId = body?.book_id;
  const referenceId = body?.reference_id ?? null;

  if (!VALID_TYPES.has(type)) {
    return NextResponse.json({ error: "Invalid share type" }, { status: 400 });
  }
  if (typeof bookId !== "string") {
    return NextResponse.json({ error: "Missing book_id" }, { status: 400 });
  }
  if (!TYPES_WITHOUT_REFERENCE.has(type) && typeof referenceId !== "string") {
    return NextResponse.json({ error: "Missing reference_id" }, { status: 400 });
  }

  // Ownership check: a "shares" row only proves the SHARE belongs to the
  // requester (RLS enforces that), not that reference_id does. That
  // cross-table check has to happen here, or one reader could mint a
  // public link to someone else's badge or reflection.
  if (type === "badge") {
    const { data: badgeOwnership } = await supabase
      .from("user_badges")
      .select("id")
      .eq("user_id", user.id)
      .eq("badge_id", referenceId)
      .maybeSingle();
    if (!badgeOwnership) {
      return NextResponse.json({ error: "Badge not found" }, { status: 404 });
    }
  } else if (type === "reflection") {
    const { data: reflection } = await supabase
      .from("reflections")
      .select("user_id, is_hidden, allow_external_share")
      .eq("id", referenceId)
      .maybeSingle();
    if (!reflection) {
      return NextResponse.json({ error: "Reflection not found" }, { status: 404 });
    }

    // The author can always share their own reflection. Anyone else may
    // only share it if the author explicitly opted in at submission time
    // (allow_external_share) AND it's currently shared to the Circle
    // (is_hidden = false). Checked here server-side, not just hidden
    // behind a UI condition in CircleFeed.tsx, so a direct API call can't
    // bypass consent.
    const isAuthor = reflection.user_id === user.id;
    const authorConsented = !reflection.is_hidden && reflection.allow_external_share;
    if (!isAuthor && !authorConsented) {
      return NextResponse.json({ error: "This reflection can't be shared." }, { status: 403 });
    }
  }

  const id = generateShareId();
  const { error } = await supabase.from("shares").insert({
    id,
    type,
    user_id: user.id,
    book_id: bookId,
    reference_id: TYPES_WITHOUT_REFERENCE.has(type) ? null : referenceId,
  });

  if (error) {
    return NextResponse.json({ error: "Something went wrong. Try again." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, shareId: id });
}
