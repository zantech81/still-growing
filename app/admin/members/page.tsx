import { createClient } from "@/lib/supabase/server";
import MembersList from "@/components/admin/MembersList";

export default async function AdminMembersPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: members } = await supabase
    .from("users")
    .select("id, display_name, nickname, email, created_at, is_admin, is_suspended")
    .order("created_at", { ascending: false });

  const { data: unlocks } = await supabase
    .from("book_unlocks")
    .select("user_id");

  const unlocksByUser = (unlocks ?? []).reduce<Record<string, number>>((acc, u) => {
    acc[u.user_id] = (acc[u.user_id] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div>
      <h1 className="text-3xl font-display text-plum mb-8">
        Members{" "}
        <span className="text-lg font-normal text-gray-400">({members?.length ?? 0})</span>
      </h1>

      {!members?.length ? (
        <p className="text-sm text-gray-400">No members yet.</p>
      ) : (
        <MembersList
          members={members}
          unlocksByUser={unlocksByUser}
          currentAdminId={user?.id ?? ""}
        />
      )}
    </div>
  );
}
