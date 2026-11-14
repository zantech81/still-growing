import type { createClient } from "@/lib/supabase/server";

// Page-level admin check for server components that read secret columns
// (book access codes, chapter passwords) through the service-role client.
// app/admin/layout.tsx already redirects non-admins, but a page must not
// rely on its layout alone before using the service role, so each such
// page re-checks here first.
export async function isAdmin(supabase: ReturnType<typeof createClient>): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase.from("users").select("is_admin").eq("id", user.id).single();
  return !!data?.is_admin;
}
