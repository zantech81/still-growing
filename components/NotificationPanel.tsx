"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Notification = {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
};

function relativeTime(iso: string): string {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en", { month: "short", year: "numeric" });
}

function notificationCopy(n: Notification): string {
  const chapter = n.payload?.chapter_number;
  switch (n.type) {
    case "reaction":
    case "heart":
      return chapter
        ? `Someone felt your reflection in Chapter ${chapter}`
        : "Someone felt your reflection";
    case "root_for":
      // Anonymous by design -- same privacy framing as the reaction copy
      // above (never names who), matching the Circle page's own "no one
      // can reply, message, or reach you here."
      return "Someone started rooting for you 🌱";
    default:
      return "You have a new notification";
  }
}

// Only "root_for" and "reaction"/"heart" go anywhere -- every other
// (current or future) type stays a plain, non-interactive <li>, since
// there's no destination for it. reflection_id must be present for a
// reaction link to be built at all (guards against malformed/legacy
// rows); book_slug is optional/best-effort -- omitted from the link
// entirely when absent, which falls back to /circle's own "auto-select
// the sole unlocked book" behavior. That's exactly right for every
// notification today, and for any stale pre-migration reaction row even
// after a second book ships (it'll land on the switcher instead of the
// exact reflection -- acceptable for historical notifications, not worth
// a data backfill).
function notificationHref(n: Notification): string | null {
  if (n.type === "root_for") return "/growing";
  if (n.type === "reaction" || n.type === "heart") {
    const reflectionId = n.payload?.reflection_id;
    if (typeof reflectionId !== "string") return null;
    const bookSlug = n.payload?.book_slug;
    const bookParam = typeof bookSlug === "string" ? `book=${bookSlug}&` : "";
    return `/circle?${bookParam}highlight=${reflectionId}`;
  }
  return null;
}

type Props = {
  onMarkRead: () => void;
  onClose: () => void;
};

export default function NotificationPanel({ onMarkRead, onClose }: Props) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setLoading(false); return; }
      const { data } = await supabase
        .from("notifications")
        .select("id, type, payload, is_read, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      const notes = data ?? [];
      setNotifications(notes);
      setLoading(false);
      const unreadIds = notes.filter((n) => !n.is_read).map((n) => n.id);
      if (unreadIds.length > 0) {
        await supabase.from("notifications").update({ is_read: true }).in("id", unreadIds);
        onMarkRead();
      }
    });
  }, [onMarkRead]);

  return (
    <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-pink-pale rounded-xl2 shadow-lg z-50 overflow-hidden">
      <div className="px-4 py-3 border-b border-pink-pale">
        <p className="text-xs uppercase tracking-widest text-gray-400 font-semibold">Notifications</p>
      </div>

      {loading ? (
        <div className="px-4 py-6 text-center text-sm text-gray-400">Loading…</div>
      ) : notifications.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-gray-400 italic">
          Nothing yet. When someone feels your reflection or roots for you, you&apos;ll see it here.
        </div>
      ) : (
        <ul className="divide-y divide-pink-pale max-h-80 overflow-y-auto">
          {notifications.map((n) => {
            const icon = n.type === "reaction" || n.type === "heart" ? "♥" : n.type === "root_for" ? "🌱" : "🔔";
            const href = notificationHref(n);
            const content = (
              <>
                <span className="text-base leading-none mt-0.5 flex-shrink-0">{icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-ink leading-snug">{notificationCopy(n)}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{relativeTime(n.created_at)}</p>
                </div>
              </>
            );
            const liClassName = `px-4 py-3 flex items-start gap-3 ${!n.is_read ? "bg-pink-pale/30" : ""}`;

            return (
              <li key={n.id} className={href ? "" : liClassName}>
                {href ? (
                  <Link href={href} onClick={onClose} className={`${liClassName} hover:bg-pink-pale/50 transition-colors`}>
                    {content}
                  </Link>
                ) : (
                  content
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
