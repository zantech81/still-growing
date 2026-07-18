"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function CircleUnreadCount({ userId }: { userId: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const key = `sg_circle_last_visit_${userId}`;
    const raw = localStorage.getItem(key);
    // If never visited, show badge for reflections from the last 7 days
    // so new users see there's community content waiting.
    const since = raw
      ? new Date(parseInt(raw, 10)).toISOString()
      : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const supabase = createClient();

    supabase
      .from("reflections")
      .select("id", { count: "exact", head: true })
      .eq("is_hidden", false)
      .neq("user_id", userId)
      .gt("created_at", since)
      .then(({ count: c }) => setCount(c ?? 0));
  }, [userId]);

  if (count === 0) return null;

  return (
    <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-pink-deep text-white text-[10px] font-bold leading-none px-1">
      {count > 99 ? "99+" : count}
    </span>
  );
}
