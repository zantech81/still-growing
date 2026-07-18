import type { SupabaseClient } from "@supabase/supabase-js";

// Shared between app/growing/page.tsx (the live page) and
// app/api/og/[type]/[shareId]/route.ts (the growing_tree share image), so
// the "distinct people, either direction, merged into one pool" rule
// (see supabase/migrations/0029_connections.sql) is defined exactly once.
export type ConnectionsSummary = {
  personIds: string[];
  // The single earliest connection row's created_at, in either direction
  // -- i.e. the moment this person's very first "Root for" relationship
  // (given or received) happened, used for the "Growing since" stat.
  // null when there are no connections yet.
  earliestConnectedAt: string | null;
  // Raw connection-row counts per originating book_id (see
  // 0031_connections_book_id.sql), rows with no book_id excluded. This is
  // a count of connections, not of distinct people -- someone with two
  // connections that originated in two different books' Circles
  // contributes to both books' counts, which is the point (tracking
  // where relationships came from, not re-deriving the unified person
  // count a second time). Empty for any pre-migration connection and,
  // in practice, for every user today: with one published book every
  // new connection gets that same single book_id, so this map never has
  // more than one entry yet.
  bookCounts: Map<string, number>;
};

export async function getConnectionsSummary(
  supabase: SupabaseClient,
  userId: string
): Promise<ConnectionsSummary> {
  const [{ data: rootingForMe }, { data: iRootFor }] = await Promise.all([
    supabase.from("connections").select("rooter_id, created_at, book_id").eq("rooted_for_id", userId),
    supabase.from("connections").select("rooted_for_id, created_at, book_id").eq("rooter_id", userId),
  ]);

  const personIds = new Set<string>();
  const bookCounts = new Map<string, number>();
  let earliestConnectedAt: string | null = null;

  function tally(rows: { created_at: unknown; book_id: unknown }[], personKey: "rooter_id" | "rooted_for_id") {
    for (const row of rows) {
      const r = row as Record<string, unknown>;
      personIds.add(r[personKey] as string);
      const createdAt = r.created_at as string;
      if (!earliestConnectedAt || createdAt < earliestConnectedAt) earliestConnectedAt = createdAt;
      if (r.book_id) {
        const bookId = r.book_id as string;
        bookCounts.set(bookId, (bookCounts.get(bookId) ?? 0) + 1);
      }
    }
  }

  tally(rootingForMe ?? [], "rooter_id");
  tally(iRootFor ?? [], "rooted_for_id");

  return { personIds: [...personIds], earliestConnectedAt, bookCounts };
}

export async function getUnifiedConnectionCount(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const { personIds } = await getConnectionsSummary(supabase, userId);
  return personIds.length;
}
