"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

// Same dismissible-per-session shape as BirthdayBanner.tsx, admin-
// controlled instead of birthday-triggered. Keyed by the message text
// itself rather than a separate "version" column: if the admin sets a
// genuinely new announcement, the key changes and it shows again even
// within the same browser session; re-showing the exact same text on
// every session refresh isn't a real problem worth a schema column for.
const STORAGE_PREFIX = "announcement_dismissed:";

export default function AnnouncementBanner({
  message,
  link,
}: {
  message: string;
  link: string | null;
}) {
  const [visible, setVisible] = useState(false);
  const storageKey = STORAGE_PREFIX + message;

  useEffect(() => {
    if (!sessionStorage.getItem(storageKey)) {
      setVisible(true);
    }
  }, [storageKey]);

  function dismiss() {
    sessionStorage.setItem(storageKey, "1");
    setVisible(false);
  }

  if (!visible) return null;

  const body = (
    <p className="font-display text-plum text-sm leading-snug">{message}</p>
  );

  return (
    <div className="sticky top-14 z-40 border-b border-pink-dusty/40 bg-pink-pale/70">
      <div className="max-w-xl mx-auto px-5 py-3 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          {link ? (
            <Link href={link} className="hover:underline">
              {body}
            </Link>
          ) : (
            body
          )}
        </div>

        <button
          onClick={dismiss}
          className="text-plum/40 hover:text-plum text-xl leading-none flex-shrink-0"
          aria-label="Dismiss announcement"
        >
          ×
        </button>
      </div>
    </div>
  );
}
