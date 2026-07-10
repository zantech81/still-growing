"use client";

import { useRef, useEffect, useState } from "react";

type Phase =
  | { tag: "idle" }
  | { tag: "uploading"; pct: number }
  | { tag: "processing"; uploadId: string }
  | { tag: "ready" }
  | { tag: "error"; msg: string };

type Props = {
  value: string; // current mux_playback_id (may be empty)
  onChange: (playbackId: string) => void;
};

export default function MuxUploader({ value, onChange }: Props) {
  const [phase, setPhase] = useState<Phase>({ tag: "idle" });
  const [showManual, setShowManual] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear polling timer on unmount.
  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
  }, []);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset the input so the same file can be re-selected after an error.
    e.target.value = "";

    setPhase({ tag: "uploading", pct: 0 });

    // 1. Get a single-use upload URL from Mux (server-side call).
    let uploadId: string;
    let uploadUrl: string;
    try {
      const res = await fetch("/api/admin/mux-upload", { method: "POST" });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json() as { uploadId: string; uploadUrl: string };
      uploadId = data.uploadId;
      uploadUrl = data.uploadUrl;
    } catch (err) {
      setPhase({ tag: "error", msg: "Could not create upload — check your connection and try again." });
      console.error("[mux-uploader] Create upload error:", err);
      return;
    }

    // 2. PUT the file directly to Mux using XHR so we can track progress.
    try {
      await uploadToMux(file, uploadUrl, (pct) =>
        setPhase({ tag: "uploading", pct })
      );
    } catch (err) {
      setPhase({ tag: "error", msg: "Upload failed — please try again." });
      console.error("[mux-uploader] Upload error:", err);
      return;
    }

    // 3. Poll until Mux finishes processing.
    setPhase({ tag: "processing", uploadId });
    pollForPlaybackId(uploadId);
  }

  function pollForPlaybackId(uploadId: string) {
    pollTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/mux-upload?uploadId=${uploadId}`);
        const data = await res.json() as { status: string; playbackId?: string };

        if (data.status === "ready" && data.playbackId) {
          setPhase({ tag: "ready" });
          onChange(data.playbackId);
          return;
        }
        if (data.status === "errored") {
          setPhase({ tag: "error", msg: "Mux reported an error processing this video. Try a different file." });
          return;
        }
        // Still processing — poll again in 4 s.
        pollForPlaybackId(uploadId);
      } catch {
        // Network hiccup — try again.
        pollForPlaybackId(uploadId);
      }
    }, 4_000);
  }

  function reset() {
    if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    setPhase({ tag: "idle" });
  }

  return (
    <div className="space-y-3">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        className="sr-only"
        onChange={handleFileChange}
      />

      {phase.tag === "idle" && (
        <div className="flex items-center gap-3">
          {value ? (
            <>
              <span className="text-xs text-green-700 bg-green-soft px-2.5 py-1 rounded-full font-medium">
                ✓ Video uploaded
              </span>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs text-gray-400 hover:text-ink transition-colors"
              >
                Replace
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="border border-dashed border-gray-300 hover:border-pink-dusty rounded-lg px-5 py-3 text-sm text-gray-400 hover:text-ink transition-colors w-full text-left"
            >
              + Upload video
            </button>
          )}
        </div>
      )}

      {phase.tag === "uploading" && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Uploading…</span>
            <span>{phase.pct}%</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-pink-deep transition-all duration-200 rounded-full"
              style={{ width: `${phase.pct}%` }}
            />
          </div>
        </div>
      )}

      {phase.tag === "processing" && (
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <Spinner />
          <span>
            Mux is processing your video — this usually takes 1–3 minutes.
            <br />
            <span className="text-xs text-gray-400">
              You can save other changes now; come back to save the video when it&rsquo;s ready.
            </span>
          </span>
        </div>
      )}

      {phase.tag === "ready" && (
        <div className="flex items-center gap-3">
          <span className="text-xs text-green-700 bg-green-soft px-2.5 py-1 rounded-full font-medium">
            ✓ Video ready — save to apply
          </span>
          <button
            type="button"
            onClick={reset}
            className="text-xs text-gray-400 hover:text-ink transition-colors"
          >
            Replace
          </button>
        </div>
      )}

      {phase.tag === "error" && (
        <div className="space-y-2">
          <p className="text-xs text-pink-deep">{phase.msg}</p>
          <button
            type="button"
            onClick={reset}
            className="text-xs text-gray-400 hover:text-ink transition-colors"
          >
            Try again
          </button>
        </div>
      )}

      {/* Manual override — hidden by default */}
      <div>
        <button
          type="button"
          onClick={() => setShowManual((v) => !v)}
          className="text-xs text-gray-300 hover:text-gray-400 transition-colors"
        >
          {showManual ? "Hide" : "Enter playback ID manually"}
        </button>
        {showManual && (
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="mt-2 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-pink-dusty transition-colors bg-white font-mono"
            placeholder="Mux playback ID"
            spellCheck={false}
          />
        )}
      </div>
    </div>
  );
}

// XHR-based upload so we can track byte-level progress.
function uploadToMux(
  file: File,
  uploadUrl: string,
  onProgress: (pct: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });
    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(100);
        resolve();
      } else {
        reject(new Error(`Upload returned ${xhr.status}`));
      }
    });
    xhr.addEventListener("error", () => reject(new Error("Network error during upload")));
    xhr.addEventListener("abort", () => reject(new Error("Upload aborted")));
    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("Content-Type", file.type || "video/mp4");
    xhr.send(file);
  });
}

function Spinner() {
  return (
    <svg
      className="animate-spin h-4 w-4 text-pink-dusty flex-shrink-0"
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}
