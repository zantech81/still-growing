"use client";

import { useEffect, useRef, useState } from "react";

type ShareKind = "badge" | "progress" | "reflection" | "growing_tree";

type Props = {
  type: ShareKind;
  bookId: string;
  referenceId?: string; // omitted for "progress"
  label: string;
  shareTitle: string;
  shareText: string;
  // Reflection shares specifically require an explicit preview + confirm
  // step before either action fires (see components/CircleFeed.tsx and
  // ClaimChapter.tsx): this is the reader's own personal words going
  // public on the internet, a different consent scope than the in-app
  // "share to Circle" checkbox. Badge/progress data is generic
  // achievement data and skips straight to the action panel.
  requireConfirmation?: boolean;
  className?: string;
  // Fires the same flow as clicking the button, once, immediately on
  // mount, so a caller can present the share panel right after a
  // successful action (e.g. submitting a reflection with "Share to
  // social media" checked) without the person having to find and click
  // a separate button afterward.
  autoStart?: boolean;
  // Renders the idle/working/error trigger as a 44x44 icon button (label
  // becomes its aria-label/title instead of visible text) to sit inline in
  // an icon row, e.g. next to ReflectionActions' Edit/Delete/lock icons.
  // Only the entry-point trigger changes shape; the ready/previewing panel
  // that opens afterward is unchanged, since it needs full width regardless.
  iconOnly?: boolean;
};

function ShareArrowIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );
}

// The link is the primary share object everywhere OG unfurling is
// supported (WhatsApp, Messenger, Telegram, iMessage, Twitter/X, Slack,
// Discord, LinkedIn). Sharing the raw PNG via Web Share's `files` array
// instead loses the link entirely on some of those (WhatsApp strips
// accompanying text/links from a file share; Facebook's file-share
// integration is unreliable). The one place a link genuinely can't work
// is Instagram, which doesn't support clickable links in captions or
// stories at all. That's what the separate "Download image" action is
// for, not a fallback but a permanent second option.
const DOWNLOAD_LABEL = "Download image (for Instagram)";
const CAPTION_TOAST_MESSAGE = "Caption copied, paste it into your post!";
const CAPTION_TOAST_DURATION_MS = 3500;

// Facebook, Instagram, and TikTok all deliberately block any form of
// pre-filled post text by platform policy. This isn't fixable with a
// different URL or API call, so the best remaining move is copying the
// suggested caption to the clipboard automatically on every share action
// (not just these three; see copyCaptionAndNotify below), so it's already
// sitting there ready to paste regardless of which platform's own
// pre-fill mechanism does or doesn't work.
function buildCaption(shareText: string, shareUrl: string): string {
  return `${shareText} ${shareUrl}`;
}

// Each platform's own officially documented share-intent URL, opened
// directly rather than routed through the generic Web Share API. This
// bypasses the inconsistent handling that motivated the link-first
// rebuild in the first place: Facebook/Twitter/Telegram fetch the page's
// OG tags themselves once opened, building the same rich preview without
// any manual pasting or relying on the OS share sheet to behave.
function buildPlatformIntents(shareUrl: string, text: string) {
  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedText = encodeURIComponent(text);
  return {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    whatsapp: `https://wa.me/?text=${encodeURIComponent(`${text} ${shareUrl}`)}`,
    twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`,
    telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
  };
}

function openIntentPopup(url: string) {
  window.open(url, "_blank", "noopener,noreferrer,width=600,height=520");
}

// Same top-right-corner "×" convention already used for BirthdayBanner's
// dismiss button and BannerImageExpand's lightbox close button, adapted
// to sit inside the panel's own bounds (this panel is inline in the page
// flow, not a full-screen overlay, so it doesn't hang outside the box the
// way the lightbox's floating circle does).
function ClosePanelButton({ onClose }: { onClose: () => void }) {
  return (
    <button
      type="button"
      onClick={onClose}
      aria-label="Close"
      className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:text-ink hover:bg-gray-100 transition-colors text-lg leading-none"
    >
      ×
    </button>
  );
}

function PlatformShareRow({
  shareUrl,
  shareText,
  onShared,
}: {
  shareUrl: string;
  shareText: string;
  onShared: () => void;
}) {
  const intents = buildPlatformIntents(shareUrl, shareText);
  const platformButtonClass =
    "text-xs border border-gray-200 hover:border-pink-dusty text-gray-500 hover:text-pink-deep px-3 py-1.5 rounded-full transition-colors";

  function handleClick(url: string) {
    openIntentPopup(url);
    onShared();
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button onClick={() => handleClick(intents.facebook)} className={platformButtonClass}>
        Facebook
      </button>
      <button onClick={() => handleClick(intents.whatsapp)} className={platformButtonClass}>
        WhatsApp
      </button>
      <button onClick={() => handleClick(intents.twitter)} className={platformButtonClass}>
        X
      </button>
      <button onClick={() => handleClick(intents.telegram)} className={platformButtonClass}>
        Telegram
      </button>
    </div>
  );
}

type State =
  | { phase: "idle" }
  | { phase: "working" }
  | { phase: "ready"; shareId: string; shareUrl: string }
  | { phase: "previewing"; shareId: string; shareUrl: string; objectUrl: string }
  | { phase: "error"; message: string };

export default function ShareButton({
  type,
  bookId,
  referenceId,
  label,
  shareTitle,
  shareText,
  requireConfirmation = false,
  className,
  autoStart = false,
  iconOnly = false,
}: Props) {
  // Starts in "working" rather than "idle" when autoStart is set, so the
  // idle button never flashes on screen for a frame before the effect
  // below fires.
  const [state, setState] = useState<State>(autoStart ? { phase: "working" } : { phase: "idle" });
  // Separate from `state`: the caption-copied toast can fire from any
  // action (Share link, any platform button, Download image) without
  // otherwise changing which panel is showing.
  const [showCaptionToast, setShowCaptionToast] = useState(false);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function copyCaptionAndNotify(shareUrl: string) {
    try {
      await navigator.clipboard.writeText(buildCaption(shareText, shareUrl));
      setShowCaptionToast(true);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      toastTimerRef.current = setTimeout(() => setShowCaptionToast(false), CAPTION_TOAST_DURATION_MS);
    } catch {
      // Clipboard access denied or unavailable; the caption text is still
      // visible in the panel below (via the shareUrl line) for manual copy.
    }
  }

  async function createShare(): Promise<string | null> {
    const res = await fetch("/api/shares", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, book_id: bookId, reference_id: referenceId ?? null }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setState({ phase: "error", message: data.error ?? "Couldn't create the share link. Try again." });
      return null;
    }
    return data.shareId;
  }

  async function fetchImageBlob(shareId: string): Promise<Blob | null> {
    const imgRes = await fetch(`/api/og/${type}/${shareId}`);
    if (!imgRes.ok) {
      setState({ phase: "error", message: "Couldn't generate the share image. Try again." });
      return null;
    }
    return imgRes.blob();
  }

  async function handleInitialClick() {
    setState({ phase: "working" });
    const shareId = await createShare();
    if (!shareId) return;

    const shareUrl = `${window.location.origin}/r/${shareId}`;

    if (requireConfirmation) {
      const blob = await fetchImageBlob(shareId);
      if (!blob) return;
      const objectUrl = URL.createObjectURL(blob);
      setState({ phase: "previewing", shareId, shareUrl, objectUrl });
      return;
    }

    setState({ phase: "ready", shareId, shareUrl });
  }

  useEffect(() => {
    if (autoStart) handleInitialClick();
    // Runs once on mount only: autoStart is a one-shot "open the panel
    // immediately" instruction from the caller, not a live toggle to
    // re-trigger on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Copy first, unconditionally, then optionally also open the native
  // share sheet as an additional convenience on top of that, not a gate
  // on it. navigator.share() returns a promise that doesn't settle until
  // the reader completes or cancels that sheet, so awaiting it BEFORE
  // copying meant closing the sheet without picking an app (or just
  // ignoring it) left the clipboard untouched. That was the exact bug this fixes.
  // The platform buttons already copy eagerly on click; this now matches
  // that same behavior.
  async function handleShareLink(shareUrl: string) {
    await copyCaptionAndNotify(shareUrl);

    const canUseWebShare = typeof navigator !== "undefined" && "share" in navigator;
    if (canUseWebShare) {
      try {
        await navigator.share({ url: shareUrl, title: shareTitle, text: shareText });
      } catch {
        // Cancelled, failed, or unsupported target: irrelevant here, since
        // the caption is already copied regardless of this outcome.
      }
    }
  }

  async function handleDownload(shareId: string, shareUrl: string) {
    const blob = await fetchImageBlob(shareId);
    if (!blob) return;
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = "still-growing.png";
    anchor.click();
    URL.revokeObjectURL(objectUrl);
    // Instagram/TikTok have no caption pre-fill mechanism at all, and
    // Download is the primary path to those apps, so this is the single
    // most important place the automatic copy needs to fire.
    await copyCaptionAndNotify(shareUrl);
  }

  // Shared by both panel states' close button. Only "previewing" shares
  // (reflection) are unconfirmed -- badge/progress/growing_tree skip
  // straight to "ready" with an already-valid share row, so there's
  // nothing to delete for those, same as the old "Done" button never
  // deleted anything. "previewing" still gets the full cleanup the old
  // "Cancel" button did: revoke the local preview blob and delete the
  // not-yet-confirmed share row so it doesn't linger in the DB.
  async function handleClosePanel() {
    if (state.phase === "previewing") {
      URL.revokeObjectURL(state.objectUrl);
      await fetch(`/api/shares/${state.shareId}`, { method: "DELETE" }).catch(() => {});
    }
    setState({ phase: "idle" });
  }

  if (state.phase === "previewing") {
    return (
      <div className="relative w-full mt-3 space-y-3 bg-white border border-pink-pale rounded-xl2 p-4">
        <ClosePanelButton onClose={handleClosePanel} />
        <p className="text-xs text-gray-400 pr-8">
          This is exactly what will be shared, your words, made public.
        </p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={state.objectUrl} alt="Preview of your shared reflection" className="w-full rounded-lg" />
        <p className="text-xs text-gray-400 break-all">{state.shareUrl}</p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleShareLink(state.shareUrl)}
            className="text-sm bg-pink-pale hover:bg-pink-dusty text-pink-deep px-4 py-2 rounded-lg transition-colors"
          >
            Share link
          </button>
          <button
            onClick={() => handleDownload(state.shareId, state.shareUrl)}
            className="text-sm border border-gray-200 hover:border-pink-dusty text-gray-500 hover:text-pink-deep px-4 py-2 rounded-lg transition-colors"
          >
            {DOWNLOAD_LABEL}
          </button>
        </div>
        {showCaptionToast && <p className="text-xs text-green-600">{CAPTION_TOAST_MESSAGE}</p>}
        <PlatformShareRow
          shareUrl={state.shareUrl}
          shareText={shareText}
          onShared={() => copyCaptionAndNotify(state.shareUrl)}
        />
      </div>
    );
  }

  if (state.phase === "ready") {
    return (
      <div className="relative w-full mt-3 space-y-2 bg-white border border-pink-pale rounded-xl2 p-4">
        <ClosePanelButton onClose={handleClosePanel} />
        <div className="flex flex-wrap gap-2 pr-8">
          <button
            onClick={() => handleShareLink(state.shareUrl)}
            className="text-sm bg-pink-pale hover:bg-pink-dusty text-pink-deep px-4 py-2 rounded-lg transition-colors"
          >
            Share link
          </button>
          <button
            onClick={() => handleDownload(state.shareId, state.shareUrl)}
            className="text-sm border border-gray-200 hover:border-pink-dusty text-gray-500 hover:text-pink-deep px-4 py-2 rounded-lg transition-colors"
          >
            {DOWNLOAD_LABEL}
          </button>
        </div>
        {showCaptionToast && <p className="text-xs text-green-600">{CAPTION_TOAST_MESSAGE}</p>}
        <p className="text-xs text-gray-400 break-all">{state.shareUrl}</p>
        <PlatformShareRow
          shareUrl={state.shareUrl}
          shareText={shareText}
          onShared={() => copyCaptionAndNotify(state.shareUrl)}
        />
      </div>
    );
  }

  if (iconOnly) {
    return (
      <div className={className}>
        <button
          onClick={handleInitialClick}
          disabled={state.phase === "working"}
          aria-label={label}
          title={label}
          className="w-11 h-11 flex items-center justify-center text-gray-400 hover:text-pink-deep transition-colors disabled:opacity-40 disabled:hover:text-gray-400 shrink-0"
        >
          <ShareArrowIcon />
        </button>
        {state.phase === "error" && <p className="text-xs text-pink-deep mt-1">{state.message}</p>}
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={handleInitialClick}
        disabled={state.phase === "working"}
        className={
          className ??
          "text-sm bg-pink-pale hover:bg-pink-dusty text-pink-deep px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
        }
      >
        {state.phase === "working" ? "Preparing…" : label}
      </button>
      {state.phase === "error" && <p className="text-xs text-pink-deep mt-1">{state.message}</p>}
    </div>
  );
}
