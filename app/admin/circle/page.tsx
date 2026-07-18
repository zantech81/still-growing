import { createClient } from "@/lib/supabase/server";
import ModerationList from "@/components/admin/ModerationList";

export default async function AdminCirclePage() {
  const supabase = createClient();

  const [{ data: rawReflections }, { data: rawReports }] = await Promise.all([
    supabase
      .from("reflections")
      .select(
        "id, text, is_hidden, flag_reason, created_at, users(nickname, display_name, email), chapters(number, title, books(title))"
      )
      .order("created_at", { ascending: false }),
    supabase.from("content_reports").select("reflection_id"),
  ]);

  type Reflection = {
    id: string;
    text: string;
    is_hidden: boolean;
    flag_reason: string | null;
    created_at: string;
    users: { nickname: string | null; display_name: string | null; email: string | null } | null;
    chapters: { number: number; title: string; books: { title: string } | null } | null;
  };

  const reflections = (rawReflections ?? []) as unknown as Reflection[];

  const reportCounts: Record<string, number> = {};
  for (const row of rawReports ?? []) {
    const id = row.reflection_id as string;
    reportCounts[id] = (reportCounts[id] ?? 0) + 1;
  }

  return (
    <div>
      <h1 className="text-3xl font-display text-plum mb-2">Circle</h1>
      <p className="text-sm text-gray-400 mb-8">
        All reflections · {reflections.length} total
      </p>
      <ModerationList reflections={reflections} reportCounts={reportCounts} />
    </div>
  );
}
