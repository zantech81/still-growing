import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Same two self-hosted weights already used for share-image generation
// (lib/og/fonts.ts) -- reusing those exact WOFF files here rather than
// fetching Google Fonts, so the live site and generated share images
// are the same typeface, not two independently-sourced "Nunito"s.
// Quicksand (tailwind.config.ts's other body-font fallback) has no
// asset here or anywhere else in the repo -- it was never actually
// loadable, so it's dropped from the stack there in favor of this
// variable, with system-ui/sans-serif as the real fallback.
const nunito = localFont({
  src: [
    { path: "../public/fonts/Nunito-Regular.woff", weight: "400", style: "normal" },
    { path: "../public/fonts/Nunito-Bold.woff", weight: "700", style: "normal" },
  ],
  variable: "--font-nunito",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Still Growing",
  description: "Where the badges become real.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={nunito.variable}>
      <body className="bg-cream text-ink font-body min-h-screen">{children}</body>
    </html>
  );
}
