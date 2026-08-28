"use client";

import { useRef, useState } from "react";
import RootForButton from "@/components/RootForButton";

// Single-target root-for toggle for app/u/[userId]/page.tsx (2026-08-28).
// Not built on a shared hook with CircleFeed.tsx's own toggleRootFor:
// that one manages a Set of many authors across one feed instance, and
// restructuring it to be single-target-per-component-instance would mean
// rendering one child component per distinct author in the feed --
// a real refactor of an already working, already race-tested piece, not
// asked for here and risky to redo without cause. This is instead a
// faithful adaptation of the exact same guard: a ref checked/set
// synchronously (so a rapid double-click can't both read a stale
// "nothing pending" snapshot before the first click's setState has been
// reflected in a render -- see CircleFeed.tsx's own long comment on this
// for the full failure mode), optimistic update, rollback on failure --
// just against a single boolean instead of a Set, since a profile page
// only ever needs one person's state.
export default function ProfileRootFor({
  targetUserId,
  targetName,
  initialRooting,
}: {
  targetUserId: string;
  targetName: string;
  initialRooting: boolean;
}) {
  const [rooting, setRooting] = useState(initialRooting);
  const [pending, setPending] = useState(false);
  const pendingRef = useRef(false);

  async function toggle() {
    if (pendingRef.current) return;
    pendingRef.current = true;
    setPending(true);

    const adding = !rooting;
    setRooting(adding);

    try {
      const res = await fetch("/api/connections", {
        method: adding ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        // No book_id -- there's no book context on a profile page, and
        // the API already treats a missing one as fine (nullable
        // column, data-capture-only).
        body: JSON.stringify({ rooted_for_id: targetUserId }),
      });

      if (!res.ok) {
        setRooting(!adding); // rollback, same as CircleFeed.tsx
      }
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  }

  return <RootForButton authorName={targetName} rooting={rooting} pending={pending} onToggle={toggle} />;
}
