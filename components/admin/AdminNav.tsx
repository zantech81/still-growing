"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/admin", label: "Dashboard", exact: true },
  { href: "/admin/books", label: "Books" },
  { href: "/admin/members", label: "Members" },
  { href: "/admin/circle", label: "Circle" },
];

export default function AdminNav() {
  const pathname = usePathname();

  return (
    <aside className="w-48 flex-shrink-0 border-r border-pink-pale bg-cream min-h-screen px-5 py-8 flex flex-col gap-8">
      <div>
        <p className="text-xs uppercase tracking-widest text-gray-400 mb-1">Admin</p>
        <Link href="/library" className="text-sm text-gray-400 hover:text-ink transition-colors">
          ← Reader view
        </Link>
      </div>

      <nav className="flex flex-col gap-1">
        {links.map(({ href, label, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                active
                  ? "bg-pink-pale text-plum font-medium"
                  : "text-gray-400 hover:text-ink hover:bg-gray-50"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
