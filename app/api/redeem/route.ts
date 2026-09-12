import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const bookId: string | undefined = body?.bookId;
  const code: string | undefined = body?.code;

  if (!bookId || !code) {
    return NextResponse.json(
      { error: "bookId and code are required." },
      { status: 400 }
    );
  }

  // Fetch the book and both its access codes server-side (never expose codes to client)
  const { data: book } = await supabase
    .from("books")
    .select("id, redemption_code, redemption_code_amazon")
    .eq("id", bookId)
    .eq("status", "published")
    .single();

  if (!book) {
    return NextResponse.json({ error: "Book not found." }, { status: 404 });
  }

  if (!book.redemption_code && !book.redemption_code_amazon) {
    return NextResponse.json(
      { error: "This book doesn't have an access code set yet. Contact the author." },
      { status: 400 }
    );
  }

  const submitted = code.toUpperCase().trim();
  const matchesMain = !!book.redemption_code && book.redemption_code.toUpperCase() === submitted;
  const matchesAmazon =
    !!book.redemption_code_amazon && book.redemption_code_amazon.toUpperCase() === submitted;

  if (!matchesMain && !matchesAmazon) {
    return NextResponse.json(
      { error: "That code doesn't match. Check your book for the correct access code." },
      { status: 400 }
    );
  }

  // Which code matched, for the admin dashboard's verification breakdown
  // (UnlockVerificationSummary.tsx) -- matchesMain and matchesAmazon can
  // never both be true (books_redemption_codes_distinct, 0063), so this
  // ordering doesn't hide a real ambiguity.
  const unlockSource: "code" | "amazon_code" = matchesMain ? "code" : "amazon_code";

  // Idempotent: already unlocked is a success
  const { data: existing } = await supabase
    .from("book_unlocks")
    .select("id")
    .eq("user_id", user.id)
    .eq("book_id", bookId)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ success: true });
  }

  const { error: insertError } = await supabase
    .from("book_unlocks")
    .insert({ user_id: user.id, book_id: bookId, unlock_source: unlockSource });

  if (insertError) {
    // Unique violation = race condition where it was already inserted; treat as success
    if (insertError.code === "23505") {
      return NextResponse.json({ success: true });
    }
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
