"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { COUNTRIES } from "@/lib/countries";
import FlagImg from "@/components/FlagImg";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function daysInMonth(month: number): number {
  return new Date(2001, month, 0).getDate();
}

type Props = {
  displayName: string;
  countryCode: string | null;
  nickname: string | null;
  birthMonth: number | null;
  birthDay: number | null;
};

export default function AccountForm({ displayName, countryCode, nickname, birthMonth, birthDay }: Props) {
  const [nicknameVal, setNicknameVal] = useState(nickname ?? "");
  const [country, setCountry] = useState(countryCode ?? "");
  const [birthMonthVal, setBirthMonthVal] = useState(birthMonth ? String(birthMonth) : "");
  const [birthDayVal, setBirthDayVal] = useState(birthDay ? String(birthDay) : "");
  const [nicknameError, setNicknameError] = useState("");
  const [nicknameStatus, setNicknameStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");

  const checkTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedMonth = parseInt(birthMonthVal, 10) || 0;
  const maxDay = selectedMonth ? daysInMonth(selectedMonth) : 31;
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
