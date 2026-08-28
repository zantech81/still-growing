"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import NotificationPanel from "@/components/NotificationPanel";
import CircleUnreadCount from "@/components/CircleUnreadCount";
import Avatar from "@/components/Avatar";

type Props = {
  name: string;
  avatarKey: string | null;
  countryCode: string | null;
  avatarColor: string;
  hasUnread: boolean;
  journeyHref: string;
  isAdmin: boolean;
  currentUserId: string;
  hasNewGrovePost: boolean;
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

// A single leaf, deliberately distinct from both GrowingIcon's full tree
// (the whole community) and CircleFeed.tsx's RootForButton sprout (a
// person-to-person action) -- this is neither, just "there's something
// new to read." A vein down the middle keeps it reading as a leaf and
// not a plain teardrop at 20px.
function GroveLeafIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 21c0-9 4-15 14-16 1 10-4 16-14 16z" />
      <path d="M5 21c2-6 6-10 12-14" />
    </svg>
  );
}

// Shield over gear (2026-08-29): a gear reads as generic "settings",
// which risks being mistaken for a future per-reader preferences icon
// this app doesn't have yet; a shield reads specifically as
// oversight/moderation, matching what this app's admin area actually
// is (self-harm flags, content moderation, member suspension -- not
// configuration). 20x20 like GroveLeafIcon, not 22x22 like the nav-tab
// icons -- this sits in the same small-utility-icon row as Grove/the
// bell, not the primary tab row.
function AdminShieldIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l7 3v6c0 5-3.5 8-7 9-3.5-1-7-4-7-9V6l7-3z" />
    </svg>
  );
}

// Library/Journey are the personal, static parts of the app (your own
// reading progress, your own book); Circle/Growing are the community-
// facing parts that change without the reader doing anything. A first
// attempt gave them plain lighter-pink text as a standing accent, but
// that read as a hover/active state rather than a deliberate signal --
// it was just a paler shade of the same pink already used for "you're
// here right now". A second attempt used one shared coral pill for
// both; this version gives each its own thematically matched color
// instead -- leaf (green) for Growing, literally a tree/growth feature,
// and marigold (orange) for Circle, a warm community feeling -- reusing
// the app's existing pill/chip language (Library page's "Available now"/
// "Coming soon"/progress tags: text-[11px] font-semibold px-2.5 py-0.5
// rounded-full) so the label itself becomes a small tag rather than
// colored text. The pill is present in BOTH active and inactive states
// -- solid when active, soft when not -- so Circle/Growing always read
// as "alive", with the solid/soft swap preserving the separate "which
// tab am I on" signal. Icon color still follows the same pink-deep/gray
// active convention every tab already used; only the label text changes
// shape here.
const COMMUNITY_TAB_COLORS: Record<string, { solid: string; soft: string; softText: string }> = {
  Circle: { solid: "bg-marigold", soft: "bg-marigold-soft", softText: "text-marigold" },
  Growing: { solid: "bg-leaf", soft: "bg-leaf-soft", softText: "text-leaf" },
};

function isCommunityTab(label: string): label is keyof typeof COMMUNITY_TAB_COLORS {
  return label === "Circle" || label === "Growing";
}

function pillClass(label: keyof typeof COMMUNITY_TAB_COLORS, isActive: boolean): string {
  const c = COMMUNITY_TAB_COLORS[label];
  return `font-semibold rounded-full transition-colors ${isActive ? `${c.solid} text-white` : `${c.soft} ${c.softText}`}`;
}

export default function AppNav({ name, avatarKey, countryCode, avatarColor, hasUnread, journeyHref, isAdmin, currentUserId, hasNewGrovePost }: Props) {
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

  // Reflects the same unread signal already driving the bell's dot onto
  // the installed app's home-screen/taskbar icon (Chrome/Edge only --
  // the Badging API isn't in TS's bundled DOM lib yet, hence the local
  // type). A plain indicator (no count) since that's honestly what
  // `showDot` represents. Feature-detected so this silently no-ops
  // anywhere unsupported (iOS Safari without notification permission
  // granted, Firefox, etc.) rather than erroring.
  useEffect(() => {
    const nav = navigator as Navigator & {
      setAppBadge?: (count?: number) => Promise<void>;
      clearAppBadge?: () => Promise<void>;
    };
    if (!nav.setAppBadge || !nav.clearAppBadge) return;
    const call = showDot ? nav.setAppBadge() : nav.clearAppBadge();
    call.catch(() => {});
  }, [showDot]);

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
        <div className="max-w-2xl mx-auto h-full px-5 flex items-center justify-between gap-6">
          {/* Logo */}
          <Link href="/library" className="flex items-center shrink-0 select-none">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/nav-logo-full.png" alt="Still Growing" className="h-10 w-auto object-contain" />
          </Link>

          <div className="flex items-center gap-4">
            {/* Desktop inline nav */}
            <nav className="hidden md:flex items-center gap-6 text-sm mr-1">
              {tabs.map(({ label, href }) => {
                const isActive = active === label;
                return (
                  <Link
                    key={label}
                    href={href}
                    className={`flex items-center gap-1.5 transition-colors ${
                      isActive ? "text-pink-deep font-medium" : "text-gray-400 hover:text-ink"
                    }`}
                  >
                    {isCommunityTab(label) ? (
                      <span className={`text-[11px] px-2.5 py-0.5 ${pillClass(label, isActive)}`}>{label}</span>
                    ) : (
                      label
                    )}
                    {label === "Circle" && !isActive && <CircleUnreadCount userId={currentUserId} />}
                  </Link>
                );
              })}
            </nav>

            {/* Grove: always links to /grove, colored the same way the
                bell is below -- gray by default, pink-deep while there's
                a genuinely newer published post this viewer hasn't seen
                (see AppShell.tsx's hasNewGrovePost). Grove posts don't
                generate bell notifications (a separate, not-yet-built
                item), so this is its own signal, not reusing hasUnread. */}
            <Link
              href="/grove"
              className={`p-1 transition-colors ${hasNewGrovePost ? "text-pink-deep" : "text-gray-400 hover:text-ink"}`}
              aria-label="The Grove"
              title="The Grove"
            >
              <GroveLeafIcon />
            </Link>

            {/* Notification bell: the icon itself changes color when
                something's unread (2026-08-29 -- replaced a separate dot
                badge entirely, same underlying showDot state the
                app-badge effect above already uses, just one visual
                signal instead of two). */}
            <div ref={bellRef} className="relative">
              <button
                onClick={() => setShowPanel((p) => !p)}
                className={`relative p-1 transition-colors ${showDot ? "text-pink-deep" : "text-gray-400 hover:text-ink"}`}
                aria-label="Notifications"
                aria-expanded={showPanel}
              >
                <BellIcon />
              </button>
              {showPanel && (
                <NotificationPanel
                  onMarkRead={() => setShowDot(false)}
                  onClose={() => setShowPanel(false)}
                />
              )}
            </div>

            {/* Admin: the single entry point at every screen size now
                (2026-08-29), replacing a desktop-only text link that had
                no mobile equivalent -- this row (unlike the tabs nav
                above) isn't screen-size-gated, so this alone covers what
                used to need the Account-page admin card (a901e63, left
                as-is, still a second/harmless path) as a mobile
                workaround. Static gray/hover, not the gray<->pink-deep
                pattern Grove/the bell use -- there's no "unseen" state
                to represent here, so no new tracking. */}
            {isAdmin && (
              <Link
                href="/admin"
                className="p-1 text-gray-300 hover:text-ink transition-colors"
                aria-label="Admin"
                title="Admin"
              >
                <AdminShieldIcon />
              </Link>
            )}

            {/* Avatar */}
            <Link
              href="/account"
              className="flex-shrink-0 hover:opacity-80 transition-opacity"
              aria-label="Account"
            >
              <Avatar avatarKey={avatarKey} countryCode={countryCode} avatarColor={avatarColor} name={name} size={32} />
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
                className={`flex flex-col items-center gap-1 flex-1 py-2 transition-colors ${
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
                {isCommunityTab(label) ? (
                  <span className={`text-[10px] px-2 py-0.5 ${pillClass(label, isActive)}`}>{label}</span>
                ) : (
                  <span className="text-[10px] font-medium tracking-wide">{label}</span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
