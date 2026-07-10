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

export default async function AdminBooksPage() {
  const supabase = createClient();

  const { data: books } = await supabase
    .from("books")
    .select("id, title, slug, status, redemption_code, collection_id, collections(name)")
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-display text-plum">Books</h1>
        <Link
          href="/admin/books/new"
          className="bg-plum text-white px-4 py-2 rounded-xl2 text-sm font-medium hover:opacity-90 transition-opacity"
        >
          + New book
        </Link>
      </div>

      {!books?.length ? (
        <p className="text-sm text-gray-400">No books yet. Create your first one.</p>
      ) : (
        <div className="space-y-3">
          {books.map((book) => {
            const collection = book.collections as unknown as { name: string } | null;
            return (
              <div
                key={book.id}
                className="bg-white border border-pink-pale rounded-xl2 px-5 py-4 flex items-center gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-medium text-plum truncate">{book.title}</p>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[book.status] ?? STATUS_BADGE.draft}`}
                    >
                      {STATUS_LABEL[book.status] ?? book.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">
                    /{book.slug}
                    {collection ? ` · ${collection.name}` : ""}
                    {book.redemption_code ? ` · Code: ${book.redemption_code}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <Link
                    href={`/admin/books/${book.id}/chapters`}
                    className="text-sm text-gray-400 hover:text-plum transition-colors"
                  >
                    Chapters
                  </Link>
                  <Link
                    href={`/admin/books/${book.id}`}
                    className="text-sm text-pink-deep hover:underline"
                  >
                    Edit
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
