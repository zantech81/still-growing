"use client";

import { useState } from "react";
import QRCode from "qrcode";

// Client-side generation, no API route: this is an admin-only, low-
// volume action (Zan downloading a handful of QR codes to drop into a
// Canva print layout), so there's no need for a server round-trip --
// the "qrcode" package runs entirely in-browser via canvas.
//
// 1500x1500px: print-quality, not a web-sized thumbnail. At a standard
// 300 DPI print resolution that's a 5" square, comfortably larger than
// any QR code is likely to actually appear on a printed page, so it can
// be scaled down in Canva without softening -- biased toward "too
// high-res" over "too small for print" per the brief.
const QR_PIXEL_SIZE = 1500;

export default function ChapterQrButton({
  url,
  chapterNumber,
}: {
  url: string;
  chapterNumber: number;
}) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(false);

  async function handleDownload() {
    setGenerating(true);
    setError(false);
    try {
      const dataUrl = await QRCode.toDataURL(url, {
        width: QR_PIXEL_SIZE,
        color: { dark: "#000000", light: "#FFFFFF" },
      });
      const anchor = document.createElement("a");
      anchor.href = dataUrl;
      anchor.download = `chapter-${chapterNumber}-qr.png`;
      anchor.click();
    } catch (err) {
      setError(true);
      console.error("[chapter-qr] Generation failed:", err);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={generating}
      className="text-sm text-gray-400 hover:text-pink-deep transition-colors flex-shrink-0 disabled:opacity-50"
      title={url}
    >
      {generating ? "Generating…" : error ? "Try again" : "QR Code"}
    </button>
  );
}
