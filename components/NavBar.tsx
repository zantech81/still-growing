"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function NavBar() {
  const pathname = usePathname();

  const link = (href: string, label: string) => (
    <Link
      href={href}
      className={
        pathname.startsWith(href)
          ? "text-pink-deep font-medium"
          : "text-gray-400 hover:text-ink transition-colors"
      }
    >
      {label}
    </Link>
  );

  return (
    <nav className="border-b border-pink-pale bg-cream sticky top-0 z-10">
      <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/library" className="font-display text-lg text-plum">
          Still Growing
        </Link>
        <div className="flex gap-6 text-sm">
          {link("/library", "Library")}
          {link("/circle", "Circle")}
          {link("/account", "Account")}
        </div>
      </div>
    </nav>
  );
}
