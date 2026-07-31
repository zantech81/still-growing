import { ImageResponse } from "next/og";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadOgFonts } from "@/lib/og/fonts";
import { profileCardTree } from "@/lib/og/renderShareImage";
import { getUnifiedConnectionCount } from "@/lib/connections";

// Same edge-runtime requirement as app/api/og/[type]/[shareId]/route.ts --
// see the comment there for why (a Windows-specific font-resolution bug
// in next/og's Node.js runtime build).
export const runtime = "edge";

type BookRow = { book_id: string; badges_earned: number };

// Public by design, same as the shares-table OG route: this is what a
// social platform's scraper fetches when /u/[userId] is shared, or when a
// signed-out visitor's browser renders the page's og:image tag. Looked up
// with the admin/service-role client, not the reader's own session --
// there is no reader session here, this request has no cookies at all.
// Unlike the shares-table route, there's no shares row to look up: the
// profile page is a stable, permanent URL, so this always renders current
// live data rather than a point-in-time snapshot.
export async function GET(request: Request, { params }: { params: { userId: string } }) {
  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("public_profiles")
    .select("id, nickname, display_name, avatar_key, avatar_color, country_code")
    .eq("id", params.userId)
    .maybeSingle();

  if (!profile) return new Response("Not found", { status: 404 });

  const name = profile.nickname ?? profile.display_name ?? "This reader";

  const [connectionCount, { data: userBooks }] = await Promise.all([
    getUnifiedConnectionCount(admin, params.userId),
    admin
      .from("user_books")
      .select("book_id, badges_earned, books(title)")
      .eq("user_id", params.userId),
  ]);

  const rows = (userBooks ?? []) as (BookRow & { books: { title: string } | { title: string }[] | null })[];
  const totalBadges = rows.reduce((sum, r) => sum + (r.badges_earned ?? 0), 0);
  const bookCount = rows.length;
  const firstBook = rows[0]?.books;
  const bookTitle = (Array.isArray(firstBook) ? firstBook[0]?.title : firstBook?.title) ?? "Still Growing";

  const origin = new URL(request.url).origin;
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? origin).replace(/^https?:\/\//, "");
  const shareUrl = `${siteUrl}/u/${profile.id}`;

  const fonts = await loadOgFonts(origin);

  return new ImageResponse(
    profileCardTree({
      name,
      avatarKey: profile.avatar_key,
      countryCode: profile.country_code,
      avatarColor: profile.avatar_color,
      connectionCount,
      totalBadges,
      bookCount,
      bookTitle,
      seed: profile.id,
      shareUrl,
    }),
    { width: 1200, height: 630, fonts }
  );
}
