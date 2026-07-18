"use client";

import { useState } from "react";

const EDIT_LIMIT = 3;

// Matches the stroke-icon convention already used in AppNav.tsx: 24x24
// viewBox, currentColor stroke, no fill, round caps/joins.
function PencilIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3a2.828 2.828 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
    </svg>
  );
}

// Locked: reflection is currently shared, clicking makes it private.
function LockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0110 0v4" />
    </svg>
  );
}

// Unlocked: reflection is currently private, clicking shares it to the Circle.
function UnlockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 019.9-1" />
    </svg>
  );
}

// Shared 44x44 tap target wrapping a visually smaller icon, so mobile
// touch accuracy doesn't depend on the icon's own (much smaller) bounds.
function IconButton({
  onClick,
  disabled,
  ariaLabel,
  title,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  ariaLabel: string;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      title={title ?? ariaLabel}
      className="w-11 h-11 flex items-center justify-center text-gray-400 hover:text-pink-deep transition-colors disabled:opacity-40 disabled:hover:text-gray-400 shrink-0"
    >
      {children}
    </button>
  );
}

type UpdatedReflection = {
  text: string;
  edit_count: number;
  is_hidden: boolean;
  hearts_count: number;
};

type Props = {
  reflectionId: string;
  text: string;
  editCount: number;
  maxLength: number;
  heartsCount?: number;
  isHidden: boolean;
  flagReason: string | null;
  onUpdated: (updated: UpdatedReflection) => void;
  onDeleted: () => void;
  onVisibilityChanged: (isHidden: boolean) => void;
  onSpamDetected?: () => void;
  // Applied to the idle icon row's root only (e.g. "ml-auto" to push it to
  // the right edge of a metadata row it shares space with). The editing/
  // confirming modes below always take the full row width regardless.
  className?: string;
};

export default function ReflectionActions({
  reflectionId,
  text,
  editCount,
  maxLength,
  heartsCount = 0,
  isHidden,
  flagReason,
  onUpdated,
  onDeleted,
  onVisibilityChanged,
  onSpamDetected,
  className,
}: Props) {
  const [mode, setMode] = useState<"idle" | "editing" | "confirmingEditReset" | "confirmingDelete">("idle");
  const [draft, setDraft] = useState(text);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const editsRemaining = Math.max(0, EDIT_LIMIT - editCount);
  const canEdit = editsRemaining > 0;
  // Spam/reported are moderation states, not the author's own choice, and
  // stay admin-only from /admin/circle. No visibility toggle for those.
  const canToggleVisibility = flagReason !== "spam" && flagReason !== "reported";

  async function toggleVisibility(shareToCircle: boolean) {
    setBusy(true);
    setError(null);

    const res = await fetch(`/api/reflections/${reflectionId}/visibility`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ share_to_circle: shareToCircle }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);

    if (!res.ok) {
      setError(data.error ?? "Something went wrong. Try again.");
      if (data.code === "spam") onSpamDetected?.();
      return;
    }

    onVisibilityChanged(data.reflection.is_hidden);
  }

  function handleSaveClick() {
    if (!draft.trim()) {
      setError("Write something first.");
      return;
    }
    if (draft.length > maxLength) {
      setError(`Reflection must be ${maxLength} characters or fewer (currently ${draft.length}).`);
      return;
    }
    setError(null);

    // Warn upfront, before submitting, only when there's actually
    // something to lose: a real text change on a reflection that already
    // has reactions.
    if (heartsCount > 0 && draft.trim() !== text) {
      setMode("confirmingEditReset");
      return;
    }
    saveEdit();
  }

  async function saveEdit() {
    setBusy(true);
    setError(null);

    const res = await fetch(`/api/reflections/${reflectionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: draft.trim() }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);

    if (!res.ok) {
      setError(data.error ?? "Something went wrong. Try again.");
      setMode("editing");
      return;
    }

    onUpdated({
      text: data.reflection.text,
      edit_count: data.reflection.edit_count,
      is_hidden: data.reflection.is_hidden,
      hearts_count: data.reflection.hearts_count,
    });
    setMode("idle");
  }

  async function confirmDelete() {
    setBusy(true);
    setError(null);

    const res = await fetch(`/api/reflections/${reflectionId}`, { method: "DELETE" });
    setBusy(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong. Try again.");
      return;
    }

    onDeleted();
  }

  if (mode === "editing") {
    return (
      <div className="w-full mt-2 space-y-1.5">
        <p className="text-xs text-gray-400">
          {editsRemaining} of {EDIT_LIMIT} edits remaining
        </p>
        <textarea
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setError(null);
          }}
          rows={3}
          className={`w-full rounded-lg border p-2 text-sm ${
            draft.length > maxLength ? "border-pink-deep" : "border-gray-200"
          }`}
        />
        <div className="flex justify-end">
          <span
            className={`text-xs tabular-nums ${
              draft.length > maxLength ? "text-pink-deep font-medium" : "text-gray-400"
            }`}
          >
            {draft.length} / {maxLength}
          </span>
        </div>
        {error && <p className="text-xs text-pink-deep">{error}</p>}
        <div className="flex gap-2">
          <button
            onClick={handleSaveClick}
            disabled={busy || draft.length > maxLength}
            className="text-xs bg-pink-pale hover:bg-pink-dusty text-pink-deep px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
          >
            {busy ? "Saving…" : "Save"}
          </button>
          <button
            onClick={() => {
              setMode("idle");
              setDraft(text);
              setError(null);
            }}
            disabled={busy}
            className="text-xs text-gray-400 hover:text-ink px-3 py-1.5 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (mode === "confirmingEditReset") {
    return (
      <div className="w-full mt-2 flex flex-wrap items-center gap-2">
        <span className="text-xs text-pink-deep">
          Editing will reset any reactions this reflection has received. Continue?
        </span>
        <button
          onClick={saveEdit}
          disabled={busy}
          className="text-xs bg-pink-pale hover:bg-pink-dusty text-pink-deep px-3 py-1 rounded-lg transition-colors disabled:opacity-50"
        >
          {busy ? "Saving…" : "Continue"}
        </button>
        <button
          onClick={() => setMode("editing")}
          disabled={busy}
          className="text-xs text-gray-400 hover:text-ink transition-colors"
        >
          Cancel
        </button>
      </div>
    );
  }

  if (mode === "confirmingDelete") {
    return (
      <div className="w-full mt-2 flex flex-wrap items-center gap-2">
        <span className="text-xs text-pink-deep">Delete this reflection? This can&rsquo;t be undone.</span>
        <button
          onClick={confirmDelete}
          disabled={busy}
          className="text-xs bg-pink-deep text-white px-3 py-1 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {busy ? "Deleting…" : "Delete"}
        </button>
        <button
          onClick={() => setMode("idle")}
          disabled={busy}
          className="text-xs text-gray-400 hover:text-ink transition-colors"
        >
          Cancel
        </button>
        {error && <span className="text-xs text-pink-deep">{error}</span>}
      </div>
    );
  }

  return (
    <div className={`space-y-1 ${className ?? ""}`}>
      <div className="flex items-center">
        <IconButton
          onClick={() => {
            setDraft(text);
            setMode("editing");
          }}
          disabled={busy || !canEdit}
          ariaLabel="Edit reflection"
          title={canEdit ? "Edit reflection" : "Edit limit reached"}
        >
          <PencilIcon />
        </IconButton>
        <IconButton onClick={() => setMode("confirmingDelete")} disabled={busy} ariaLabel="Delete reflection">
          <TrashIcon />
        </IconButton>
        {canToggleVisibility && (
          <IconButton
            // Target state === current isHidden: hidden -> request shared
            // (true), shared -> request hidden (false).
            onClick={() => toggleVisibility(isHidden)}
            disabled={busy}
            ariaLabel={isHidden ? "Share to Circle" : "Make private"}
          >
            {isHidden ? <UnlockIcon /> : <LockIcon />}
          </IconButton>
        )}
      </div>
      {error && <p className="text-xs text-pink-deep">{error}</p>}
    </div>
  );
}
