import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function AdminChaptersPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const [{ data: book }, { data: chapters }] = await Promise.all([
    supabase.from("books").select("id, title, slug").eq("id", params.id).single(),
    supabase
      .from("chapters")
      .select("id, number, title, milestone_label, mux_playback_id, badges(name)")
      .eq("book_id", params.id)
      .order("number"),
  ]);

  if (!book) notFound();

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-3xl font-display text-plum">Chapters</h1>
        <Link
          href={`/admin/books/${params.id}/chapters/new`}
          className="bg-plum text-white px-4 py-2 rounded-xl2 text-sm font-medium hover:opacity-90 transition-opacity"
        >
          + New chapter
        </Link>
      </div>
      <p className="text-sm text-gray-400 mb-8">
        <Link href={`/admin/books/${params.id}`} className="hover:text-plum transition-colors">
          {book.title}
        </Link>{" "}
        · /{book.slug}
      </p>

      {!chapters?.length ? (
        <p className="text-sm text-gray-400">No chapters yet.</p>
      ) : (
        <div className="space-y-2">
          {chapters.map((ch) => {
            const badge = ch.badges as unknown as { name: string } | null;
            return (
              <div
                key={ch.id}
                className="bg-white border border-pink-pale rounded-xl2 px-5 py-4 flex items-center gap-4"
              >
                <span className="text-xs text-gray-300 w-6 text-right flex-shrink-0">
                  {ch.number}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-plum truncate">{ch.title}</p>
                  <p className="text-xs text-gray-400">
                    {ch.milestone_label ?? "—"}
                    {badge ? ` · Badge: ${badge.name}` : ""}
                    {ch.mux_playback_id ? " · Video ✓" : ""}
                  </p>
                </div>
                <Link
                  href={`/admin/books/${params.id}/chapters/${ch.id}`}
                  className="text-sm text-pink-deep hover:underline flex-shrink-0"
                >
                  Edit
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
