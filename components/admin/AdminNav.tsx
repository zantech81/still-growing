"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AdminNav({
  unacknowledgedCount,
  pendingCount,
}: {
  unacknowledgedCount: number;
  pendingCount: number;
}) {
  const pathname = usePathname();

  const links: { href: string; label: string; exact?: boolean; count?: number }[] = [
    { href: "/admin", label: "Dashboard", exact: true },
    { href: "/admin/collections", label: "Collections" },
    { href: "/admin/books", label: "Books" },
    { href: "/admin/members", label: "Members" },
    { href: "/admin/circle", label: "Circle" },
    { href: "/admin/self-harm", label: "Wellbeing", count: unacknowledgedCount },
    { href: "/admin/reviews", label: "Reviews", count: pendingCount },
    { href: "/admin/grove", label: "The Grove" },
    { href: "/admin/email-templates", label: "Email Templates" },
  ];

  return (
    <aside className="w-48 flex-shrink-0 border-r border-pink-pale bg-cream min-h-screen px-5 py-8 flex flex-col gap-8">
      <div>
        <p className="text-xs uppercase tracking-widest text-gray-400 mb-1">Admin</p>
        <Link href="/library" className="text-sm text-gray-400 hover:text-ink transition-colors">
          ← Reader view
        </Link>
      </div>

      <nav className="flex flex-col gap-1">
        {links.map(({ href, label, exact, count }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between gap-2 ${
                active
                  ? "bg-pink-pale text-plum font-medium"
                  : "text-gray-400 hover:text-ink hover:bg-gray-50"
              }`}
            >
              <span>{label}</span>
              {typeof count === "number" && count > 0 && (
                <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-pink-deep text-white text-[10px] font-bold leading-none px-1">
                  {count > 99 ? "99+" : count}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
