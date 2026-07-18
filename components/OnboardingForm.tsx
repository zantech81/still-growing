"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
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

export default function OnboardingForm() {
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [country, setCountry] = useState("");
  const [birthMonth, setBirthMonth] = useState("");
  const [birthDay, setBirthDay] = useState("");
  const [nicknameError, setNicknameError] = useState("");
  const [nicknameStatus, setNicknameStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const [submitting, setSubmitting] = useState(false);

  const checkTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedMonth = parseInt(birthMonth, 10) || 0;
  const maxDay = selectedMonth ? daysInMonth(selectedMonth) : 31;
  const dayOptions = Array.from({ length: maxDay }, (_, i) => i + 1);

  // Debounced live nickname uniqueness check
  useEffect(() => {
    const trimmed = nickname.trim();
    if (!trimmed) {
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
  }, [nickname]);

  async function handleSave() {
    const trimmed = nickname.trim();
    if (!trimmed) {
      setNicknameError("Please choose a nickname.");
      return;
    }
    if (nicknameStatus === "taken") {
      setNicknameError("That nickname is taken. Try another one.");
      return;
    }
    setSubmitting(true);
    setNicknameError("");

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const payload: Record<string, unknown> = { nickname: trimmed };
    if (country) payload.country_code = country;
    if (birthMonth && birthDay) {
      payload.birth_month = parseInt(birthMonth, 10);
      payload.birth_day = parseInt(birthDay, 10);
    }

    const { error } = await supabase
      .from("users")
      .update(payload)
      .eq("id", user.id);

    if (error) {
      if (error.code === "23505") {
        setNicknameError("That nickname is taken. Try another one.");
      } else {
        setNicknameError("Something went wrong. Please try again.");
      }
      setSubmitting(false);
      return;
    }

    router.push("/library");
    router.refresh();
  }

  async function handleSkipOptional() {
    const trimmed = nickname.trim();
    if (!trimmed) {
      setNicknameError("Please choose a nickname first.");
      return;
    }
    setCountry("");
    setBirthMonth("");
    setBirthDay("");
    await handleSave();
  }

  const hasOptional = country || birthMonth || birthDay;

  return (
    <div className="space-y-8">
      {/* Nickname */}
      <div>
        <label
          htmlFor="nickname"
          className="text-xs uppercase tracking-widest text-gray-400 block mb-2"
        >
          Your nickname <span className="text-pink-deep">*</span>
        </label>
        <input
          id="nickname"
          type="text"
          value={nickname}
          onChange={(e) => {
            setNickname(e.target.value);
            setNicknameError("");
          }}
          placeholder="e.g. Sunflower, DadOf3, QuietLearner"
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
        {!nicknameError && nicknameStatus === "idle" && (
          <p className="text-xs text-gray-400 mt-1">
            This is the name shown next to your reflections in the Circle.
          </p>
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
            onChange={(e) => setCountry(e.target.value)}
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
      </div>

      {/* Birthday */}
      <div>
        <p className="text-xs uppercase tracking-widest text-gray-400 mb-2">
          Birthday{" "}
          <span className="normal-case tracking-normal text-gray-300">(optional, we'll celebrate you)</span>
        </p>
        <div className="flex gap-3">
          <select
            value={birthMonth}
            onChange={(e) => {
              setBirthMonth(e.target.value);
              setBirthDay("");
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
            value={birthDay}
            onChange={(e) => setBirthDay(e.target.value)}
            disabled={!birthMonth}
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

      <div className="flex flex-col gap-3">
        <button
          onClick={handleSave}
          disabled={submitting || nicknameStatus === "taken"}
          className="bg-plum text-white px-6 py-3 rounded-xl2 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {submitting ? "Saving…" : "Start my journey"}
        </button>
        {hasOptional ? (
          <button
            type="button"
            onClick={handleSkipOptional}
            disabled={submitting}
            className="text-sm text-gray-400 hover:text-ink transition-colors"
          >
            Skip optional fields
          </button>
        ) : null}
      </div>
    </div>
  );
}
