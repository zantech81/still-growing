"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { COUNTRIES } from "@/lib/countries";
import { AVATARS } from "@/lib/avatars";
import FlagImg from "@/components/FlagImg";
import Avatar from "@/components/Avatar";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function daysInMonth(month: number): number {
  return new Date(2001, month, 0).getDate();
}

type Props = {
  userId: string;
  displayName: string;
  countryCode: string | null;
  nickname: string | null;
  birthMonth: number | null;
  birthDay: number | null;
  avatarKey: string | null;
  avatarColor: string;
  isAdmin: boolean;
};

export default function AccountForm({
  userId,
  displayName,
  countryCode,
  nickname,
  birthMonth,
  birthDay,
  avatarKey,
  avatarColor,
  isAdmin,
}: Props) {
  const [nicknameVal, setNicknameVal] = useState(nickname ?? "");
  const [country, setCountry] = useState(countryCode ?? "");
  const [avatar, setAvatar] = useState(avatarKey ?? "");
  const [birthMonthVal, setBirthMonthVal] = useState(birthMonth ? String(birthMonth) : "");
  const [birthDayVal, setBirthDayVal] = useState(birthDay ? String(birthDay) : "");
  const [nicknameError, setNicknameError] = useState("");
  const [nicknameStatus, setNicknameStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");

  const checkTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedMonth = parseInt(birthMonthVal, 10) || 0;
  const maxDay = selectedMonth ? daysInMonth(selectedMonth) : 31;
  // Gates who can PICK an admin-only option, not how an already-saved one
  // renders -- Avatar.tsx's AVATAR_MAP lookup is deliberately untouched.
  const pickableAvatars = AVATARS.filter((a) => !a.adminOnly || isAdmin);
  const dayOptions = Array.from({ length: maxDay }, (_, i) => i + 1);

  // Debounced live nickname uniqueness check
  useEffect(() => {
    const trimmed = nicknameVal.trim();
    if (!trimmed) {
      setNicknameStatus("idle");
      return;
    }
    // If it's the same as their current nickname, no need to check
    if (trimmed.toLowerCase() === (nickname ?? "").toLowerCase()) {
      setNicknameStatus("idle");
      return;
    }
    setNicknameStatus("checking");
    if (checkTimeout.current) clearTimeout(checkTimeout.current);
    checkTimeout.current = setTimeout(async () => {
      const res = await fetch(`/api/check-nickname?nickname=${encodeURIComponent(trimmed)}`);
      const data = await res.json().catch(() => ({ available: true }));
      setNicknameStatus(data.available ? "available" : "taken");
    }, 500);
    return () => { if (checkTimeout.current) clearTimeout(checkTimeout.current); };
  }, [nicknameVal, nickname]);

  async function handleSave() {
    if (nicknameStatus === "taken") {
      setNicknameError("That nickname is taken. Try another one.");
      return;
    }
    setNicknameError("");
    setStatus("saving");

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const payload: Record<string, unknown> = {
      nickname: nicknameVal.trim() || null,
      country_code: country || null,
      birth_month: birthMonthVal ? parseInt(birthMonthVal, 10) : null,
      birth_day: birthDayVal ? parseInt(birthDayVal, 10) : null,
      avatar_key: avatar || null,
    };

    const { error } = await supabase
      .from("users")
      .update(payload)
      .eq("id", user.id);

    if (error) {
      setStatus("idle");
      if (error.code === "23505") {
        setNicknameError("That nickname is taken. Try another one.");
      } else {
        setNicknameError("Something went wrong. Please try again.");
      }
      return;
    }

    setStatus("saved");
    setTimeout(() => setStatus("idle"), 2500);
  }

  return (
    <div className="space-y-8">
      {/* Read-only display name from auth provider */}
      <div>
        <p className="text-xs uppercase tracking-widest text-gray-400 mb-1">Name</p>
        <p className="text-lg">{displayName}</p>
      </div>

      {/* Avatar */}
      <div>
        <p className="text-xs uppercase tracking-widest text-gray-400 mb-2">
          Avatar{" "}
          <span className="normal-case tracking-normal text-gray-300">
            (shown on your profile and in the Circle)
          </span>
        </p>
        <div className="flex items-center gap-4 mb-3">
          <Avatar
            avatarKey={avatar || null}
            countryCode={country || null}
            avatarColor={avatarColor}
            name={nicknameVal || displayName}
            size={48}
          />
          <p className="text-xs text-gray-400">
            {avatar
              ? "Pick a different one below, or clear it to fall back to your flag."
              : country
              ? "No avatar picked -- your flag is shown instead."
              : "No avatar or country set -- your initial is shown instead."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {pickableAvatars.map((a) => (
            <button
              key={a.key}
              type="button"
              onClick={() => setAvatar(avatar === a.key ? "" : a.key)}
              aria-label={a.label}
              aria-pressed={avatar === a.key}
              className={`w-11 h-11 rounded-full overflow-hidden flex items-center justify-center text-lg transition-shadow ${
                avatar === a.key ? "ring-2 ring-offset-2 ring-pink-deep" : ""
              }`}
              style={{ backgroundColor: a.color }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {a.image ? <img src={a.image} alt="" className="w-full h-full object-cover" /> : a.emoji}
            </button>
          ))}
        </div>
        <Link
          href={`/u/${userId}`}
          className="flex items-center justify-between gap-3 bg-pink-pale hover:bg-pink-dusty transition-colors rounded-xl2 px-5 py-4 mt-4"
        >
          <span>
            <span className="block font-display text-plum">View My Public Profile</span>
            <span className="block text-xs text-pink-deep mt-0.5">
              What others see when they click your name in the Circle
            </span>
          </span>
          <span className="text-pink-deep text-lg" aria-hidden="true">→</span>
        </Link>
        {/* External, cross-domain link (baby.stillgrowing.co, not this
            app) -- plain <a>, not next/link's <Link>. No existing
            target/rel convention in this codebase fit a signed-in reader
            deliberately leaving an active session (the one other
            external link out to this domain, BookPromo.tsx's salesUrl,
            is same-tab, but that's cold/logged-out traffic with no app
            session to preserve -- not really the same situation), so
            this opens in a new tab instead. */}
        <a
          href="https://baby.stillgrowing.co/gift?ref=account"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between gap-3 bg-pink-pale hover:bg-pink-dusty transition-colors rounded-xl2 px-5 py-4 mt-4"
        >
          <span>
            <span className="block font-display text-plum">Give a Copy</span>
            <span className="block text-xs text-pink-deep mt-0.5">
              Someone else might need this too
            </span>
          </span>
          <span className="text-pink-deep text-lg" aria-hidden="true">→</span>
        </a>
      </div>

      {/* Nickname */}
      <div>
        <label
          htmlFor="nickname"
          className="text-xs uppercase tracking-widest text-gray-400 block mb-2"
        >
          Nickname{" "}
          <span className="normal-case tracking-normal text-gray-300">(shown in the Circle)</span>
        </label>
        <input
          id="nickname"
          type="text"
          value={nicknameVal}
          onChange={(e) => {
            setNicknameVal(e.target.value);
            setNicknameError("");
            setStatus("idle");
          }}
          placeholder="e.g. Sunflower, DadOf3"
          maxLength={30}
          className={`w-full border ${
            nicknameError || nicknameStatus === "taken" ? "border-pink-deep" : "border-gray-200"
          } rounded-xl2 px-4 py-3 text-sm focus:outline-none focus:border-pink-dusty transition-colors bg-white`}
        />
        {nicknameError && (
          <p className="text-xs text-pink-deep mt-1">{nicknameError}</p>
        )}
        {!nicknameError && nicknameStatus === "checking" && (
          <p className="text-xs text-gray-400 mt-1">Checking…</p>
        )}
        {!nicknameError && nicknameStatus === "available" && (
          <p className="text-xs text-green-600 mt-1">✓ Available</p>
        )}
        {!nicknameError && nicknameStatus === "taken" && (
          <p className="text-xs text-pink-deep mt-1">That nickname is taken. Try another one.</p>
        )}
      </div>

      {/* Country */}
      <div>
        <label
          htmlFor="country"
          className="text-xs uppercase tracking-widest text-gray-400 block mb-2"
        >
          Country{" "}
          <span className="normal-case tracking-normal text-gray-300">(optional)</span>
        </label>
        <div className="relative">
          {country && (
            <span className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none flex items-center">
              <FlagImg code={country} className="rounded-sm" />
            </span>
          )}
          <select
            id="country"
            value={country}
            onChange={(e) => {
              setCountry(e.target.value);
              setStatus("idle");
            }}
            className={`w-full border border-gray-200 rounded-xl2 py-3 pr-4 appearance-none bg-white focus:outline-none focus:border-pink-dusty transition-colors ${country ? "pl-11" : "pl-4"}`}
          >
            <option value="">Not set</option>
            {COUNTRIES.map(({ code, name }) => (
              <option key={code} value={code}>
                {name}
              </option>
            ))}
          </select>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          If set, your flag appears next to your name in the Circle.
        </p>
      </div>

      {/* Birthday */}
      <div>
        <p className="text-xs uppercase tracking-widest text-gray-400 mb-2">
          Birthday{" "}
          <span className="normal-case tracking-normal text-gray-300">(optional, we'll celebrate you)</span>
        </p>
        <div className="flex gap-3">
          <select
            value={birthMonthVal}
            onChange={(e) => {
              setBirthMonthVal(e.target.value);
              setBirthDayVal("");
              setStatus("idle");
            }}
            className="flex-1 border border-gray-200 rounded-xl2 px-3 py-3 text-sm bg-white focus:outline-none focus:border-pink-dusty transition-colors"
          >
            <option value="">Month</option>
            {MONTHS.map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
          <select
            value={birthDayVal}
            onChange={(e) => {
              setBirthDayVal(e.target.value);
              setStatus("idle");
            }}
            disabled={!birthMonthVal}
            className="w-24 border border-gray-200 rounded-xl2 px-3 py-3 text-sm bg-white focus:outline-none focus:border-pink-dusty transition-colors disabled:opacity-40"
          >
            <option value="">Day</option>
            {dayOptions.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={status === "saving" || nicknameStatus === "taken"}
        className="bg-pink-pale hover:bg-pink-dusty transition-colors text-pink-deep font-display px-6 py-3 rounded-xl2 disabled:opacity-50"
      >
        {status === "saving" ? "Saving…" : status === "saved" ? "Saved ✓" : "Save"}
      </button>
    </div>
  );
}
