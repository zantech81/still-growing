import { createClient } from "@/lib/supabase/server";
import SelfHarmFlagsList from "@/components/admin/SelfHarmFlagsList";

// No auth check here: app/admin/layout.tsx already gates every route under
// /admin to a signed-in admin, same as app/admin/circle/page.tsx. Also
// never linked from anywhere a reader could reach -- the only way in is
// typing this URL directly as an admin, or the QuickLink card on
// app/admin/page.tsx's dashboard.
export default async function AdminSelfHarmPage() {
  const supabase = createClient();

  const { data: rawFlags } = await supabase
    .from("self_harm_flags")
    .select(
      "id, flagged_text, created_at, acknowledged, acknowledged_at, users(nickname, display_name, email), books(title), chapters(number, title)"
    )
    .order("acknowledged", { ascending: true })
    .order("created_at", { ascending: false });

  type Flag = {
    id: string;
    flagged_text: string;
    created_at: string;
    acknowledged: boolean;
    acknowledged_at: string | null;
    users: { nickname: string | null; display_name: string | null; email: string | null } | null;
    books: { title: string } | null;
    chapters: { number: number; title: string } | null;
  };

  const flags = (rawFlags ?? []) as unknown as Flag[];
  const unacknowledgedCount = flags.filter((f) => !f.acknowledged).length;

  return (
    <div>
      <h1 className="text-3xl font-display text-plum mb-2">Wellbeing</h1>
      <p className="text-sm text-gray-400 mb-8">
        Reflections and reviews blocked for self-harm language · {flags.length} total
        {unacknowledgedCount > 0 && `, ${unacknowledgedCount} need review`}
      </p>
      <SelfHarmFlagsList flags={flags} />
    </div>
  );
}
