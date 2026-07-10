import { createClient } from "@/lib/supabase/server";
import ModerationList from "@/components/admin/ModerationList";

export default async function AdminCirclePage() {
  const supabase = createClient();

  const { data: rawReflections } = await supabase
    .from("reflections")
    .select(
      "id, content, is_hidden, created_at, users(display_name, email), chapters(number, title, books(title))"
    )
    .order("created_at", { ascending: false });

  type Reflection = {
    id: string;
    content: string;
    is_hidden: boolean;
    created_at: string;
    users: { display_name: string | null; email: string | null } | null;
    chapters: { number: number; title: string; books: { title: string } | null } | null;
  };

  const reflections = (rawReflections ?? []) as unknown as Reflection[];

  return (
    <div>
      <h1 className="text-3xl font-display text-plum mb-2">Circle</h1>
      <p className="text-sm text-gray-400 mb-8">
        All reflections · {reflections.length} total
      </p>
      <ModerationList reflections={reflections} />
    </div>
  );
}
