"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "birthday_banner_shown";

export default function BirthdayBanner({ name }: { name: string }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!sessionStorage.getItem(STORAGE_KEY)) {
      setVisible(true);
    }
  }, []);

  function dismiss() {
    sessionStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      className="sticky top-14 z-40 border-b border-gold/40"
      style={{
        background: "linear-gradient(135deg, #FDF4E3 0%, #F9E8EF 60%, #FDF4E3 100%)",
      }}
    >
      <div className="max-w-xl mx-auto px-5 py-4 flex items-start gap-3">
        <div className="flex gap-0.5 flex-shrink-0 mt-0.5 text-base leading-none" aria-hidden="true">
          <span>✨</span>
          <span>🎂</span>
          <span>✨</span>
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-display text-plum text-sm leading-snug">
            Happy birthday, {name}!
          </p>
          <p className="text-xs text-plum/70 mt-0.5 leading-relaxed">
            Today is a good day to remember. You were born ready. Still are.
          </p>
        </div>

        <button
          onClick={dismiss}
          className="text-plum/40 hover:text-plum text-xl leading-none flex-shrink-0 mt-0.5 transition-colors"
          aria-label="Dismiss birthday message"
        >
          ×
        </button>
      </div>
    </div>
  );
}
