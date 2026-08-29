"use client";

import { useEffect, useRef, useState } from "react";
import { NodeViewWrapper, NodeViewContent, type NodeViewProps } from "@tiptap/react";
import MuxPlayer from "@mux/mux-player-react";

type Phase =
  | { tag: "idle" }
  | { tag: "uploading"; pct: number }
  | { tag: "processing"; uploadId: string }
  | { tag: "error"; msg: string };

// The NodeView for MuxVideoBlock (see muxVideoBlock.ts) -- an extended
// CodeBlock whose `language` attr is "mux-video" and whose text content
// is a Mux playback id. Reuses the exact same direct-to-Mux upload +
// polling flow as components/admin/MuxUploader.tsx (same
// /api/admin/mux-upload endpoints), adapted to write its result into a
// ProseMirror node's text content instead of a form field's React state.
export default function MuxVideoNodeView({ node, editor, getPos, deleteNode }: NodeViewProps) {
  const isMuxVideo = node.attrs.language === "mux-video";
  const existingPlaybackId = isMuxVideo ? node.textContent.trim() : "";
  const [phase, setPhase] = useState<Phase>({ tag: "idle" });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
  }, []);

  // A genuine code block -- typed via the inherited ``` input rule, or
  // pasted in from elsewhere -- not this component's concern. No
  // admin-facing toolbar button ever creates one of these (the toolbar's
  // "insert video" button always sets language: "mux-video" directly), so
  // this branch exists purely so a stray real code block still renders
  // and edits normally instead of silently becoming a broken video slot.
  if (!isMuxVideo) {
    return (
      <NodeViewWrapper>
        <pre>
          <code>
            <NodeViewContent />
          </code>
        </pre>
      </NodeViewWrapper>
    );
  }

  // Writes directly into this node's own text-content range rather than
  // an attr: CodeBlock's built-in markdown serialization (which this node
  // inherits unchanged, see muxVideoBlock.ts) writes a node's text content
  // as the fenced block's body and its `language` attr as the fence's
  // info string -- exactly the on-disk shape this needs
  // (```mux-video\n{playbackId}\n```), with zero custom markdown code.
  function replacePlaybackId(playbackId: string) {
    const pos = getPos();
    if (typeof pos !== "number") return;
    const from = pos + 1;
    const to = from + node.textContent.length;
    editor.view.dispatch(editor.state.tr.insertText(playbackId, from, to));
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    setPhase({ tag: "uploading", pct: 0 });

    let uploadId: string;
    let uploadUrl: string;
    try {
      const res = await fetch("/api/admin/mux-upload", { method: "POST" });
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as { uploadId: string; uploadUrl: string };
      uploadId = data.uploadId;
      uploadUrl = data.uploadUrl;
    } catch (err) {
      setPhase({ tag: "error", msg: "Could not create upload. Check your connection and try again." });
      console.error("[grove-editor] Create upload error:", err);
      return;
    }

    try {
      await uploadToMux(file, uploadUrl, (pct) => setPhase({ tag: "uploading", pct }));
    } catch (err) {
      setPhase({ tag: "error", msg: "Upload failed. Please try again." });
      console.error("[grove-editor] Upload error:", err);
      return;
    }

    setPhase({ tag: "processing", uploadId });
    pollForPlaybackId(uploadId);
  }

  function pollForPlaybackId(uploadId: string) {
    pollTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/mux-upload?uploadId=${uploadId}`);
        const data = (await res.json()) as { status: string; playbackId?: string };

        if (data.status === "ready" && data.playbackId) {
          replacePlaybackId(data.playbackId);
          return;
        }
        if (data.status === "errored") {
          setPhase({ tag: "error", msg: "Mux reported an error processing this video. Try a different file." });
          return;
        }
        pollForPlaybackId(uploadId);
      } catch {
        pollForPlaybackId(uploadId);
      }
    }, 4_000);
  }

  if (existingPlaybackId) {
    return (
      <NodeViewWrapper className="my-2" contentEditable={false}>
        {/* This node's underlying ProseMirror content IS the playback id
            (see replacePlaybackId above) -- CodeBlock's schema expects a
            contentDOM for it regardless of what this NodeView chooses to
            show, so a hidden NodeViewContent still has to exist here or
            ProseMirror falls back to surfacing the raw text on its own
            (reproduced: the playback id rendered as visible text above
            the player until this was added). display:none, not removed:
            this needs to stay a real, present DOM node for ProseMirror to
            manage, just not one a reader/admin should ever see. */}
        <div style={{ display: "none" }}>
          <NodeViewContent />
        </div>
        <div className="relative group">
          <div className="aspect-video rounded-xl2 overflow-hidden bg-black">
            <MuxPlayer
              playbackId={existingPlaybackId}
              streamType="on-demand"
              style={{ width: "100%", height: "100%" }}
            />
          </div>
          <button
            type="button"
            onClick={() => deleteNode()}
            aria-label="Remove video"
            className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-full bg-white/90 text-gray-500 hover:text-pink-deep transition-colors text-sm opacity-0 group-hover:opacity-100"
          >
            ×
          </button>
        </div>
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper className="my-2" contentEditable={false}>
      {/* Same reasoning as the ready branch above -- empty right now, but
          still needs to be present. */}
      <div style={{ display: "none" }}>
        <NodeViewContent />
      </div>
      <input ref={fileInputRef} type="file" accept="video/*" className="sr-only" onChange={handleFileChange} />

      {phase.tag === "idle" && (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="border border-dashed border-gray-300 hover:border-pink-dusty rounded-lg px-5 py-3 text-sm text-gray-400 hover:text-ink transition-colors flex-1 text-left"
          >
            + Upload video
          </button>
          <button
            type="button"
            onClick={() => deleteNode()}
            aria-label="Cancel"
            className="text-xs text-gray-300 hover:text-gray-400 transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {phase.tag === "uploading" && (
        <div className="space-y-2 border border-gray-200 rounded-lg p-3">
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
        <div className="text-sm text-gray-500 border border-gray-200 rounded-lg p-3">
          Mux is processing your video. This usually takes 1–3 minutes.
          <br />
          <span className="text-xs text-gray-400">
            You can keep editing; come back and save once it&rsquo;s ready.
          </span>
        </div>
      )}

      {phase.tag === "error" && (
        <div className="space-y-2 border border-pink-pale rounded-lg p-3">
          <p className="text-xs text-pink-deep">{phase.msg}</p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setPhase({ tag: "idle" })}
              className="text-xs text-gray-400 hover:text-ink transition-colors"
            >
              Try again
            </button>
            <button
              type="button"
              onClick={() => deleteNode()}
              className="text-xs text-gray-300 hover:text-gray-400 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </NodeViewWrapper>
  );
}

// Same XHR-based upload as components/admin/MuxUploader.tsx, duplicated
// rather than imported: that component's `value`/`onChange` props are
// shaped for a single whole-form video field, not a per-node upload
// living inside a ProseMirror document.
function uploadToMux(file: File, uploadUrl: string, onProgress: (pct: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
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
