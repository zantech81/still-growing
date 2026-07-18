"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

type Props = {
  bookId: string;
  title: string;
  subtitle: string | null;
  coverImageUrl: string | null;
  nextUrl?: string | null; // preserve deep-link destination through the unlock flow
};

export default function LockedBookCard({
  bookId,
  title,
  subtitle,
  coverImageUrl,
  nextUrl,
}: Props) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "error" | "unlocked">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleCardClick() {
    if (!expanded) {
      setExpanded(true);
      setTimeout(() => inputRef.current?.focus(), 40);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim() || status === "submitting" || status === "unlocked") return;

    setStatus("submitting");
    setErrorMsg(null);

    const res = await fetch("/api/redeem", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookId, code: code.trim() }),
    });

    if (res.ok) {
      setStatus("unlocked");
      // If the reader arrived here from a deep link, send them straight back
      if (nextUrl?.startsWith("/")) {
        router.push(nextUrl);
      } else {
        router.refresh();
      }
    } else {
      const data = await res.json().catch(() => ({}));
      setStatus("error");
      setErrorMsg(data.error ?? "Something went wrong. Try again.");
    }
  }

  return (
    <div
      className={`flex gap-4 bg-white border border-pink-pale rounded-xl2 p-4 opacity-70 ${
        !expanded ? "cursor-pointer hover:border-pink-dusty hover:opacity-90" : ""
      } transition-all`}
      onClick={!expanded ? handleCardClick : undefined}
    >
      {/* Cover: grayscale while locked */}
      {coverImageUrl ? (
        <img
          src={coverImageUrl}
          alt={title}
          className="w-[50px] aspect-[5/8] min-w-[50px] object-cover rounded-lg flex-shrink-0 self-start grayscale"
        />
      ) : (
        <div
          className="w-[50px] aspect-[5/8] rounded-lg flex-shrink-0 flex items-center justify-center text-xl select-none opacity-40"
          style={{ background: "linear-gradient(145deg, #F7E1E9, #E6F1FB)" }}
        >
          📖
        </div>
      )}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h3 className="font-display text-plum text-[1.05rem] leading-snug mb-0.5 opacity-60">{title}</h3>
        {subtitle && (
          <p className="text-xs text-gray-400 mb-3 leading-snug">{subtitle}</p>
        )}

        {!expanded ? (
          <span className="text-sm text-gray-400">🔒 Enter your code to unlock</span>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="space-y-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.toUpperCase());
                  if (status === "error") {
                    setStatus("idle");
                    setErrorMsg(null);
                  }
                }}
                placeholder="Your access code"
                disabled={status === "submitting" || status === "unlocked"}
                autoComplete="off"
                spellCheck={false}
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm uppercase tracking-widest focus:outline-none focus:border-pink-dusty transition-colors disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!code.trim() || status === "submitting" || status === "unlocked"}
                className="bg-pink-pale hover:bg-pink-dusty text-pink-deep text-sm px-4 py-2 rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap"
              >
                {status === "submitting"
                  ? "…"
                  : status === "unlocked"
                  ? "Unlocked ✓"
                  : "Unlock"}
              </button>
            </div>
            {status === "error" && errorMsg && (
              <p className="text-sm text-pink-deep">{errorMsg}</p>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
