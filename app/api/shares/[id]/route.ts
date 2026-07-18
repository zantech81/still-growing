import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Used only for the reflection-share confirmation flow: if the reader
// previews the image and cancels, the share row created to generate that
// preview is deleted so nothing they didn't explicitly confirm stays
// public. Ownership-checked implicitly by RLS ("users delete own shares").
export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error } = await supabase.from("shares").delete().eq("id", params.id).eq("user_id", user.id);
  if (error) {
    return NextResponse.json({ error: "Something went wrong. Try again." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
