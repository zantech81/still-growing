"use client";

import { useEffect, useState } from "react";

type Props = {
  src: string;
  alt: string;
  thumbnailClassName?: string;
};

export default function BannerImageExpand({ src, alt, thumbnailClassName }: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    // Prevent background scroll while modal is open
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      {/* Compact cropped thumbnail, click to expand */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`relative group cursor-zoom-in overflow-hidden rounded-xl2 ${thumbnailClassName ?? ""}`}
        aria-label="View full cover image"
      >
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-cover object-top"
        />
        {/* Expand icon: visible on hover/focus, hidden otherwise */}
        <span
          aria-hidden
          className="absolute bottom-1.5 right-1.5 p-1 rounded bg-black/45 text-white opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-150 pointer-events-none"
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
          </svg>
        </span>
      </button>

      {/* Lightbox modal */}
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Full cover image"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-8"
          onClick={() => setOpen(false)}
        >
          <div
            className="relative max-w-[280px] w-full"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="absolute -top-4 -right-4 z-10 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center text-ink hover:bg-gray-100 transition-colors leading-none text-lg"
            >
              ×
            </button>
            <img
              src={src}
              alt={alt}
              className="w-full rounded-xl2 shadow-2xl"
            />
          </div>
        </div>
      )}
    </>
  );
}
