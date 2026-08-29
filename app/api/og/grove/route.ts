import { ImageResponse } from "next/og";
import { loadOgFonts } from "@/lib/og/fonts";
import { loadOgBadgeIcon } from "@/lib/og/badge";
import { groveCardTree } from "@/lib/og/renderShareImage";

// Same edge-runtime requirement as app/api/og/[type]/[shareId]/route.ts --
// see the comment there for why (a Windows-specific font-resolution bug
// in next/og's Node.js runtime build).
export const runtime = "edge";

// One generic image for every Grove share, not a route per post -- see
// groveCardTree's own comment in lib/og/renderShareImage.tsx for why. No
// params, no DB lookup: this never varies.
export async function GET(request: Request) {
  const origin = new URL(request.url).origin;
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? origin).replace(/^https?:\/\//, "");
  const shareUrl = `${siteUrl}/grove`;

  const [fonts, badgeSrc] = await Promise.all([loadOgFonts(origin), loadOgBadgeIcon(origin)]);

  return new ImageResponse(groveCardTree({ shareUrl, badgeSrc }), { width: 1200, height: 630, fonts });
}
