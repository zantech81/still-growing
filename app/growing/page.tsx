export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getConnectionsSummary } from "@/lib/connections";
import { COUNTRIES } from "@/lib/countries";
import { pickGrowthQuote } from "@/lib/growthQuotes";
import AppShell from "@/components/AppShell";
import GrowingTree from "@/components/GrowingTree";
import ShareButton from "@/components/ShareButton";
import FlagImg from "@/components/FlagImg";

const COUNTRY_NAMES = new Map(COUNTRIES.map((c) => [c.code, c.name]));
// Beyond this many distinct countries, the 3x3 grid gets a 4th row
// showing a "+N more countries" summary instead of growing unbounded --
// same overflow philosophy as the tree's own leaf cap
// (lib/growingTree.ts's LEAF_DISPLAY_CAP).
const COUNTRY_DISPLAY_CAP = 9;

export default async function GrowingPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/growing");

  // A person who both roots for the viewer and whom the viewer roots for
  // counts once, not twice, and no direction is tracked past the count
  // itself -- by design, the tree never distinguishes who-rooted-for-whom.
  // Leaves are anonymous colored dots, not per-person markers, so the
  // count alone is enough for order-stable rendering: the tree's tip
  // positions are a fixed function of the seed (see lib/growingTree.ts),
  // and always showing "the first N tips" for the current count N means
  // existing leaves never move as connections are added or removed --
  // there's no need to separately track *which* tip belongs to *which*
  // person or when they connected.
  const { personIds, earliestConnectedAt, bookCounts } = await getConnectionsSummary(supabase, user.id);
  const connectionCount = personIds.length;

  // Only ever queried/shown once connections actually span more than one
  // book_id (see supabase/migrations/0031_connections_book_id.sql). With
  // one published book, every connection gets the same book_id, so
  // bookCounts.size is always <= 1 today and this whole block is a no-op:
  // no query, no UI. The tree itself never reads this -- it stays fully
  // unified regardless of how many books are represented.
  let bookBreakdown: { title: string; count: number }[] = [];
  if (bookCounts.size > 1) {
    const { data: booksData } = await supabase.from("books").select("id, title").in("id", [...bookCounts.keys()]);
    bookBreakdown = (booksData ?? [])
      .map((b) => ({ title: b.title as string, count: bookCounts.get(b.id as string) ?? 0 }))
      .sort((a, b) => b.count - a.count);
  }

  // Country breakdown: people without a country set simply don't
  // contribute, same graceful-absence pattern as FlagImg's other call
  // sites (CircleFeed.tsx only renders a flag when country_code is set).
  const countryCounts = new Map<string, number>();
  if (personIds.length > 0) {
    const { data: connectedUsers } = await supabase
      .from("users")
      .select("country_code")
      .in("id", personIds);
    for (const row of connectedUsers ?? []) {
      if (!row.country_code) continue;
      countryCounts.set(row.country_code, (countryCounts.get(row.country_code) ?? 0) + 1);
    }
  }
  const countryBreakdown = [...countryCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([code, count]) => ({ code, count, name: COUNTRY_NAMES.get(code) ?? code }));
  const visibleCountries = countryBreakdown.slice(0, COUNTRY_DISPLAY_CAP);
  const hiddenCountryCount = countryBreakdown.length - visibleCountries.length;

  const growingSince = earliestConnectedAt
    ? new Date(earliestConnectedAt).toLocaleDateString("en", { month: "long", day: "numeric", year: "numeric" })
    : null;

  const quote = pickGrowthQuote(user.id);

  // "Root for" connections aren't scoped to a book (see
  // supabase/migrations/0029_connections.sql), but shares.book_id is
  // NOT NULL (0023_shares.sql), so a growing_tree share still needs some
  // book to attach to. Mirrors AppShell.tsx's own "most recently started
  // book" pick for journeyHref, for the same reason: there's no more
  // meaningful choice when the content itself isn't book-specific.
  const { data: recentBook } = await supabase
    .from("user_books")
    .select("book_id")
    .eq("user_id", user.id)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const displayName = (
    await supabase.from("users").select("nickname, display_name").eq("id", user.id).single()
  ).data;
  const ownName = displayName?.nickname ?? displayName?.display_name ?? "my";

  return (
    <AppShell>
      <main className="max-w-xl mx-auto px-5 py-8 text-center">
        <h1 className="text-3xl mb-1">Growing</h1>
        <p className="text-gray-400 italic text-sm mb-8">
          {connectionCount === 0
            ? "No one's rooting for your growth yet."
            : connectionCount === 1
            ? "1 person growing with you."
            : `${connectionCount} people growing with you.`}
        </p>

        <GrowingTree seed={user.id} connectionCount={connectionCount} className="w-full max-w-sm mx-auto" />

        <div className="mt-8 max-w-sm mx-auto">
          <p className="font-display italic text-plum text-lg leading-relaxed">&ldquo;{quote.text}&rdquo;</p>
          <p className="text-xs text-gray-400 mt-2">- {quote.source}</p>
        </div>

        {(growingSince || countryCounts.size > 0) && (
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-1 mt-8 text-xs text-gray-400">
            {growingSince && <span>Growing since {growingSince}</span>}
            {countryCounts.size > 0 && (
              <span>
                {countryCounts.size} {countryCounts.size === 1 ? "country" : "countries"} growing with you
              </span>
            )}
          </div>
        )}

        {bookBreakdown.length > 1 && (
          <p className="text-xs text-gray-400 mt-1">
            {bookBreakdown.map((b) => `${b.count} from ${b.title}`).join(", ")}
          </p>
        )}

        {countryBreakdown.length > 0 && (
          <div className="grid grid-cols-3 gap-x-3 gap-y-2 justify-items-center mt-4 max-w-sm mx-auto text-sm text-ink">
            {visibleCountries.map(({ code, count, name }) => (
              <span key={code} className="flex items-center gap-1.5">
                <FlagImg code={code} className="rounded-sm" />
                {name} · {count}
              </span>
            ))}
            {hiddenCountryCount > 0 && (
              <span className="col-span-3 text-gray-400">+{hiddenCountryCount} more countries</span>
            )}
          </div>
        )}

        {connectionCount === 0 ? (
          <p className="text-sm text-gray-400 mt-8">
            Root for someone in the Circle, or share your journey so others can root for you.
          </p>
        ) : (
          recentBook && (
            <div className="flex justify-center mt-8">
              <ShareButton
                type="growing_tree"
                bookId={recentBook.book_id}
                label="Share your tree"
                shareTitle="My Growing Tree"
                shareText={`${ownName} has ${connectionCount} people rooting for their growth on Still Growing.`}
              />
            </div>
          )
        )}
      </main>
    </AppShell>
  );
}
