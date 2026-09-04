import { ImageResponse } from "next/og";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadOgFonts } from "@/lib/og/fonts";
import { loadOgBadgeIcon } from "@/lib/og/badge";
import { groveCardTree, grovePostCardTree } from "@/lib/og/renderShareImage";
import { excerptFromMarkdown } from "@/lib/grove";

// Same edge-runtime requirement as app/api/og/[type]/[shareId]/route.ts --
// see the comment there for why (a Windows-specific font-resolution bug
// in next/og's Node.js runtime build).
export const runtime = "edge";

// ?post=<id>, same param app/grove/page.tsx's generateMetadata already
// reads, renders that post's own card (grovePostCardTree) generated fresh
// from a live, published-only lookup -- same "no shares-row snapshot"
// situation as app/api/og/profile/[userId]/route.ts. No param, or a post
// id that's missing/unpublished, falls back to the generic whole-page card
// (groveCardTree) exactly as before.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = url.origin;
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? origin).replace(/^https?:\/\//, "");
  const postId = url.searchParams.get("post");

  const [fonts, badgeSrc] = await Promise.all([loadOgFonts(origin), loadOgBadgeIcon(origin)]);

  if (postId) {
    const admin = createAdminClient();
    const { data: post } = await admin
      .from("grove_posts")
      .select("title, body")
      .eq("id", postId)
      .eq("status", "published")
      .maybeSingle();

    if (post) {
      const shareUrl = `${siteUrl}/grove?post=${postId}`;
      return new ImageResponse(
        grovePostCardTree({
          title: post.title,
          excerpt: excerptFromMarkdown(post.body, 160),
          shareUrl,
          badgeSrc,
        }),
        { width: 1200, height: 630, fonts }
      );
    }
  }

  const shareUrl = `${siteUrl}/grove`;
  return new ImageResponse(groveCardTree({ shareUrl, badgeSrc }), { width: 1200, height: 630, fonts });
}
