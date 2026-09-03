import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminNav from "@/components/admin/AdminNav";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin");

  const { data: profile } = await supabase
    .from("users")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) redirect("/library");

  const [{ count: unacknowledgedCount }, { count: pendingCount }] = await Promise.all([
    supabase.from("self_harm_flags").select("*", { count: "exact", head: true }).eq("acknowledged", false),
    supabase.from("reviews").select("*", { count: "exact", head: true }).eq("status", "pending"),
  ]);

  return (
    <div className="flex min-h-screen bg-cream">
      <AdminNav unacknowledgedCount={unacknowledgedCount ?? 0} pendingCount={pendingCount ?? 0} />
      <div className="flex-1 min-w-0 p-8 max-w-5xl">{children}</div>
    </div>
  );
}
