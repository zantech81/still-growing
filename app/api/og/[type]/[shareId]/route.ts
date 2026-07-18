import { ImageResponse } from "next/og";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadOgFonts } from "@/lib/og/fonts";
import { badgeCardTree, progressCardTree, reflectionCardTree, growingTreeCardTree } from "@/lib/og/renderShareImage";
import { getUnifiedConnectionCount } from "@/lib/connections";

// Edge runtime, not the (default) Node.js runtime: Next 14.2's bundled
// next/og (@vercel/og) has a Windows-specific bug in its Node.js runtime
// build: it resolves its default fallback font via
// `fileURLToPath(import.meta.url)` in a way that produces an invalid URL
// on Windows paths (`ERR_INVALID_URL`), crashing every request outright.
// The edge runtime build doesn't hit this path at all and works
// correctly; @vercel/og is designed edge-first anyway, so this isn't a
// workaround so much as the intended runtime for this API.
export const runtime = "edge";

// Public by design: this is the actual image a social platform's scraper
// (or a signed-out visitor's browser) fetches when /r/[shareId] is
// rendered or shared. Looked up via the admin/service-role client only
// (see the RLS comment in 0023_shares.sql). Never exposes the shares
// table itself to the browser.
export async function GET(
  request: Request,
  { params }: { params: { type: string; shareId: string } }
) {
  const admin = createAdminClient();

  const { data: share } = await admin
    .from("shares")
    .select("id, type, user_id, book_id, reference_id")
    .eq("id", params.shareId)
    .maybeSingle();

  if (!share || share.type !== params.type) {
    return new Response("Not found", { status: 404 });
  }

  const origin = new URL(request.url).origin;
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? origin).replace(/^https?:\/\//, "");
  const shareUrl = `${siteUrl}/r/${share.id}`;

  const fonts = await loadOgFonts(origin);

  if (share.type === "badge") {
    const { data: badge } = await admin
      .from("badges")
      .select("name, description, badge_image_url")
      .eq("id", share.reference_id)
      .maybeSingle();

    if (!badge) return new Response("Not found", { status: 404 });

    return new ImageResponse(
      badgeCardTree({
        badgeName: badge.name,
        badgeDescription: badge.description,
        badgeImageUrl: badge.badge_image_url,
        shareUrl,
      }),
      { width: 1200, height: 630, fonts }
    );
  }

  if (share.type === "progress") {
    const [{ data: book }, { data: userBook }, { count: totalChapters }] = await Promise.all([
      admin.from("books").select("title").eq("id", share.book_id).single(),
      admin
        .from("user_books")
        .select("badges_earned")
        .eq("user_id", share.user_id)
        .eq("book_id", share.book_id)
        .maybeSingle(),
      admin.from("chapters").select("id", { count: "exact", head: true }).eq("book_id", share.book_id),
    ]);

    return new ImageResponse(
      progressCardTree({
        bookTitle: book?.title ?? "Still Growing",
        badgesEarned: userBook?.badges_earned ?? 0,
        totalChapters: totalChapters ?? 0,
        shareUrl,
      }),
      { width: 1200, height: 630, fonts }
    );
  }

  if (share.type === "growing_tree") {
    const [{ data: owner }, connectionCount] = await Promise.all([
      admin.from("users").select("nickname, display_name").eq("id", share.user_id).maybeSingle(),
      getUnifiedConnectionCount(admin, share.user_id),
    ]);

    return new ImageResponse(
      growingTreeCardTree({
        authorName: owner?.nickname ?? owner?.display_name ?? "This reader",
        connectionCount,
        seed: share.user_id,
        shareUrl,
      }),
      { width: 1200, height: 630, fonts }
    );
  }

  // reflection: attribute to whoever actually WROTE it (reflection.user_id),
  // never to share.user_id. Since another reader can now share a
  // reflection that isn't theirs (with the author's consent), those two
  // are no longer always the same person.
  const { data: reflection } = await admin
    .from("reflections")
    .select("text, chapter_number, user_id")
    .eq("id", share.reference_id)
    .maybeSingle();

  if (!reflection) return new Response("Not found", { status: 404 });

  const { data: author } = await admin
    .from("users")
    .select("nickname, display_name")
    .eq("id", reflection.user_id)
    .maybeSingle();

  return new ImageResponse(
    reflectionCardTree({
      text: reflection.text,
      authorName: author?.nickname ?? author?.display_name ?? "A reader",
      chapterNumber: reflection.chapter_number,
      shareUrl,
    }),
    { width: 1200, height: 630, fonts }
  );
}
