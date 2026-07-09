import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Still Growing",
  description: "Where the badges become real.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-cream text-ink font-body min-h-screen">{children}</body>
    </html>
  );
}
