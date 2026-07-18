export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/AppShell";

type UnlockJoin = {
  books: { slug: string; title: string; subtitle: string | null; cover_image_url: string | null };
};

// Only ever reached when AppShell.tsx's journeyHref computed 2+ unlocked
// books (see there); with 0 or 1, nav links straight to /library or the
// one book, same as before this existed. The redirects below are just
// defensive for a direct hit on this URL, not the normal path in.
export default async function JourneySwitcherPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/journey");

  const { data: rawUnlocks } = await supabase
    .from("book_unlocks")
    .select("books(slug, title, subtitle, cover_image_url)")
    .eq("user_id", user.id);

  const unlocks = (rawUnlocks ?? []) as unknown as UnlockJoin[];

  if (unlocks.length === 0) redirect("/library");
  if (unlocks.length === 1) redirect(`/${unlocks[0].books.slug}`);

  return (
    <AppShell>
      <main className="max-w-xl mx-auto px-5 py-8">
        <h1 className="text-3xl mb-0.5">Choose your journey</h1>
        <p className="text-gray-400 mb-8 italic text-sm">Pick which book to continue.</p>

        <div className="space-y-3">
          {unlocks.map(({ books: book }) => (
            <Link
              key={book.slug}
              href={`/${book.slug}`}
              className="flex gap-4 bg-white border border-pink-pale hover:border-pink-dusty rounded-xl2 p-4 transition-colors"
            >
              {book.cover_image_url ? (
                <img
                  src={book.cover_image_url}
                  alt={book.title}
                  className="w-[50px] aspect-[5/8] min-w-[50px] object-cover rounded-lg flex-shrink-0 self-start"
                />
              ) : (
                <div
                  className="w-[50px] aspect-[5/8] rounded-lg flex-shrink-0 flex items-center justify-center text-xl select-none"
                  style={{ background: "linear-gradient(145deg, #F7E1E9, #E6F1FB)" }}
                >
                  📖
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-display text-plum text-[1.05rem] leading-snug mb-0.5">
                  {book.title}
                </h3>
                {book.subtitle && <p className="text-xs text-gray-400 leading-snug">{book.subtitle}</p>}
              </div>
            </Link>
          ))}
        </div>
      </main>
    </AppShell>
  );
}
