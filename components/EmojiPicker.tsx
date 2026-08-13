"use client";

import { useEffect, useRef, useState } from "react";

// Curated for a reflective, warm tone -- not a full emoji keyboard. Avoids
// anything cutesy/novelty (no winks, tongues, party poppers) in favor of
// feeling, growth, and gratitude: the emotional range a reflection on a
// baby milestone chapter actually needs.
const REFLECTIVE_EMOJIS = [
  "🙂", "😊", "🥹", "😢", "😂", "🤔", "😌", "🥰",
  "❤️", "🤗", "🙏", "💪", "✨", "⭐", "🌱", "🌸",
  "🌷", "🕊️", "💛", "💫",
];

type Props = {
  onSelect: (emoji: string) => void;
  className?: string;
};

export default function EmojiPicker({ onSelect, className }: Props) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  return (
    <div ref={containerRef} className={`relative ${className ?? ""}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close emoji picker" : "Add an emoji"}
        title="Add an emoji"
        className="w-7 h-7 flex items-center justify-center rounded-full text-base leading-none text-gray-400 hover:text-pink-deep hover:bg-pink-pale transition-colors"
      >
        🙂
      </button>
      {open && (
        <div
          role="menu"
          className="absolute left-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-xl2 shadow-lg p-2 grid grid-cols-5 gap-0.5 w-[196px]"
        >
          {REFLECTIVE_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              role="menuitem"
              onClick={() => {
                onSelect(emoji);
                setOpen(false);
              }}
              aria-label={`Insert ${emoji}`}
              className="w-8 h-8 flex items-center justify-center text-lg rounded-lg hover:bg-blue-soft transition-colors"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
