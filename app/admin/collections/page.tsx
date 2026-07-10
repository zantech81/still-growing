import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const STATUS_BADGE: Record<string, string> = {
  draft: "bg-gray-100 text-gray-500",
  coming_soon: "bg-blue-soft text-plum",
  published: "bg-green-soft text-plum",
};

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  coming_soon: "Coming soon",
  published: "Published",
};

export default async function AdminCollectionsPage() {
  const supabase = createClient();

  const [{ data: collections }, { data: books }] = await Promise.all([
    supabase
      .from("collections")
      .select("id, name, description, sort_order, status")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
    supabase.from("books").select("id, collection_id"),
  ]);

  const bookCountByCollection = (books ?? []).reduce<Record<string, number>>((acc, b) => {
    acc[b.collection_id] = (acc[b.collection_id] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-display text-plum">Collections</h1>
        <Link
          href="/admin/collections/new"
          className="bg-plum text-white px-4 py-2 rounded-xl2 text-sm font-medium hover:opacity-90 transition-opacity"
        >
          + New collection
        </Link>
      </div>

      {!collections?.length ? (
        <p className="text-sm text-gray-400">No collections yet. Create your first one.</p>
      ) : (
        <div className="space-y-3">
          {collections.map((col) => (
            <div
              key={col.id}
              className="bg-white border border-pink-pale rounded-xl2 px-5 py-4 flex items-center gap-4"
            >
              <span className="text-xs text-gray-300 w-6 text-right flex-shrink-0">
                {col.sort_order}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="font-medium text-plum truncate">{col.name}</p>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[col.status] ?? STATUS_BADGE.draft}`}
                  >
                    {STATUS_LABEL[col.status] ?? col.status}
                  </span>
                </div>
                <p className="text-xs text-gray-400">
                  {bookCountByCollection[col.id] ?? 0} book
                  {(bookCountByCollection[col.id] ?? 0) !== 1 ? "s" : ""}
                  {col.description ? ` · ${col.description}` : ""}
                </p>
              </div>
              <Link
                href={`/admin/collections/${col.id}`}
                className="text-sm text-pink-deep hover:underline flex-shrink-0"
              >
                Edit
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
