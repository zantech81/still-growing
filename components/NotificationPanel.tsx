"use client";

import { useEffect, useState } from "react";
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
    default:
      return "You have a new notification";
  }
}

type Props = {
  onMarkRead: () => void;
};

export default function NotificationPanel({ onMarkRead }: Props) {
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
          Nothing yet. When someone feels your reflection, you'll see it here.
        </div>
      ) : (
        <ul className="divide-y divide-pink-pale max-h-80 overflow-y-auto">
          {notifications.map((n) => (
            <li
              key={n.id}
              className={`px-4 py-3 flex items-start gap-3 ${!n.is_read ? "bg-pink-pale/30" : ""}`}
            >
              <span className="text-base leading-none mt-0.5 flex-shrink-0">
                {n.type === "reaction" || n.type === "heart" ? "♥" : "🔔"}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-ink leading-snug">{notificationCopy(n)}</p>
                <p className="text-xs text-gray-400 mt-0.5">{relativeTime(n.created_at)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
