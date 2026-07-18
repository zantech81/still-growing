"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import NotificationPanel from "@/components/NotificationPanel";
import CircleUnreadCount from "@/components/CircleUnreadCount";

type Props = {
  initial: string;
  avatarColor: string;
  hasUnread: boolean;
  journeyHref: string;
  isAdmin: boolean;
  currentUserId: string;
};

const TABS = [
  { label: "Library", href: "/library" },
  { label: "Journey", href: null }, // href filled in at render time from journeyHref
  { label: "Circle", href: "/circle" },
  { label: "Growing", href: "/growing" },
] as const;

function BellIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 01-3.46 0" />
    </svg>
  );
}

function LibraryIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" />
      <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
    </svg>
  );
}

function JourneyIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </svg>
  );
}

function CircleIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87" />
      <path d="M16 3.13a4 4 0 010 7.75" />
    </svg>
  );
}

// A small tree, deliberately distinct from CircleFeed.tsx's single-seedling
// "Root for" icon: this represents the whole community tree, not one
// person-to-person action.
function GrowingIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22v-6" />
      <path d="M12 16c-4 0-7-3-7-7 0-1 .2-2 .6-2.8C6.4 4.8 9 3 12 3s5.6 1.8 6.4 3.2c.4.8.6 1.8.6 2.8 0 4-3 7-7 7z" />
    </svg>
  );
}

export default function AppNav({ initial, avatarColor, hasUnread, journeyHref, isAdmin, currentUserId }: Props) {
  const pathname = usePathname();
  const [showPanel, setShowPanel] = useState(false);
  const [showDot, setShowDot] = useState(hasUnread);
  const bellRef = useRef<HTMLDivElement>(null);

  // Close panel on click outside the bell wrapper
  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (showPanel && bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setShowPanel(false);
      }
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [showPanel]);

  function activeTab(): "Library" | "Journey" | "Circle" | "Growing" | null {
    if (pathname.startsWith("/library")) return "Library";
    if (pathname.startsWith("/circle")) return "Circle";
    if (pathname.startsWith("/growing")) return "Growing";
    if (
      !pathname.startsWith("/account") &&
      !pathname.startsWith("/admin") &&
      !pathname.startsWith("/login") &&
      pathname !== "/"
    ) {
      return "Journey";
    }
    return null;
  }

  const active = activeTab();

  const tabs = [
    { label: "Library" as const, href: "/library", Icon: LibraryIcon },
    { label: "Journey" as const, href: journeyHref, Icon: JourneyIcon },
    { label: "Circle" as const, href: "/circle", Icon: CircleIcon },
    { label: "Growing" as const, href: "/growing", Icon: GrowingIcon },
  ];

  return (
    <>
      {/* Fixed top header */}
      <header className="fixed top-0 inset-x-0 z-30 h-14 bg-cream/95 backdrop-blur-sm border-b border-pink-pale">
        <div className="max-w-2xl mx-auto h-full px-5 flex items-center justify-between">
          {/* Logo */}
          <Link href="/library" className="font-display italic text-[1.25rem] text-pink-deep leading-none select-none">
            Still <span className="not-italic text-plum">Growing</span>
          </Link>

          <div className="flex items-center gap-4">
            {/* Desktop inline nav */}
            <nav className="hidden md:flex items-center gap-6 text-sm mr-1">
              {tabs.map(({ label, href }) => (
                <Link
                  key={label}
                  href={href}
                  className={`flex items-center gap-1.5 transition-colors ${
                    active === label
                      ? "text-pink-deep font-medium"
                      : "text-gray-400 hover:text-ink"
                  }`}
                >
                  {label}
                  {label === "Circle" && active !== "Circle" && (
                    <CircleUnreadCount userId={currentUserId} />
                  )}
                </Link>
              ))}
              {isAdmin && (
                <Link
                  href="/admin"
                  className="text-gray-300 hover:text-ink transition-colors border-l border-gray-200 pl-6"
                >
                  Admin
                </Link>
              )}
            </nav>

            {/* Notification bell */}
            <div ref={bellRef} className="relative">
              <button
                onClick={() => setShowPanel((p) => !p)}
                className="relative p-1 text-gray-400 hover:text-ink transition-colors"
                aria-label="Notifications"
                aria-expanded={showPanel}
              >
                <BellIcon />
                {showDot && (
                  <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-pink-deep rounded-full border-2 border-cream" />
                )}
              </button>
              {showPanel && (
                <NotificationPanel
                  onMarkRead={() => setShowDot(false)}
                />
              )}
            </div>

            {/* Avatar */}
            <Link
              href="/account"
              className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-[13px] font-semibold text-white leading-none"
              style={{ backgroundColor: avatarColor }}
              aria-label="Account"
            >
              {initial}
            </Link>
          </div>
        </div>
      </header>

      {/* Mobile bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur-sm border-t border-pink-pale">
        <div className="flex items-center justify-around h-16 safe-area-bottom">
          {tabs.map(({ label, href, Icon }) => {
            const isActive = active === label;
            return (
              <Link
                key={label}
                href={href}
                className={`flex flex-col items-center gap-1 flex-1 py-2 text-[10px] font-medium tracking-wide transition-colors ${
                  isActive ? "text-pink-deep" : "text-gray-400"
                }`}
              >
                <span className="relative inline-flex overflow-visible">
                  <Icon active={isActive} />
                  {label === "Circle" && !isActive && (
                    <span className="absolute -top-1 -right-1 z-10">
                      <CircleUnreadCount userId={currentUserId} />
                    </span>
                  )}
                </span>
                <span>{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
