import { createClient } from "@/lib/supabase/server";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function AdminMembersPage() {
  const supabase = createClient();

  const { data: members } = await supabase
    .from("users")
    .select("id, display_name, nickname, email, created_at, is_admin")
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
        <div className="bg-white border border-pink-pale rounded-xl2 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-pink-pale">
                <th className="text-left px-5 py-3 text-xs uppercase tracking-widest text-gray-400 font-normal">
                  Name
                </th>
                <th className="text-left px-5 py-3 text-xs uppercase tracking-widest text-gray-400 font-normal hidden sm:table-cell">
                  Email
                </th>
                <th className="text-left px-5 py-3 text-xs uppercase tracking-widest text-gray-400 font-normal hidden md:table-cell">
                  Joined
                </th>
                <th className="text-center px-5 py-3 text-xs uppercase tracking-widest text-gray-400 font-normal">
                  Books
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-pink-pale">
              {members.map((m) => (
                <tr key={m.id} className="hover:bg-cream transition-colors">
                  <td className="px-5 py-3">
                    <span className="text-plum font-medium">
                      {(m as { nickname?: string | null }).nickname ?? m.display_name ?? "Not set"}
                    </span>
                    {(m as { nickname?: string | null }).nickname && m.display_name && (
                      <span className="block text-xs text-gray-400">{m.display_name}</span>
                    )}
                    {m.is_admin && (
                      <span className="ml-2 text-xs bg-gold/20 text-plum px-1.5 py-0.5 rounded-full">
                        Admin
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-gray-400 hidden sm:table-cell">
                    {m.email ?? "Not set"}
                  </td>
                  <td className="px-5 py-3 text-gray-400 hidden md:table-cell">
                    {m.created_at ? formatDate(m.created_at) : "Not set"}
                  </td>
                  <td className="px-5 py-3 text-center text-gray-400">
                    {unlocksByUser[m.id] ?? 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
