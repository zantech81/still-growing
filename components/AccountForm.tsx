"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { COUNTRIES, codeToFlag } from "@/lib/countries";

type Props = {
  displayName: string;
  countryCode: string | null;
};

export default function AccountForm({ displayName, countryCode }: Props) {
  const [country, setCountry] = useState(countryCode ?? "");
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");

  async function handleSave() {
    setStatus("saving");
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from("users")
      .update({ country_code: country || null })
      .eq("id", user.id);

    setStatus("saved");
    setTimeout(() => setStatus("idle"), 2500);
  }

  const selectedFlag = country ? codeToFlag(country) : null;

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs uppercase tracking-widest text-gray-400 mb-1">Name</p>
        <p className="text-lg">{displayName}</p>
      </div>

      <div>
        <label
          htmlFor="country"
          className="text-xs uppercase tracking-widest text-gray-400 block mb-2"
        >
          Country{" "}
          <span className="normal-case tracking-normal text-gray-300">(optional)</span>
        </label>

        <div className="relative">
          {selectedFlag && (
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg pointer-events-none">
              {selectedFlag}
            </span>
          )}
          <select
            id="country"
            value={country}
            onChange={(e) => {
              setCountry(e.target.value);
              setStatus("idle");
            }}
            className={`w-full border border-gray-200 rounded-xl2 py-3 pr-4 appearance-none bg-white focus:outline-none focus:border-pink-dusty transition-colors ${selectedFlag ? "pl-11" : "pl-4"}`}
          >
            <option value="">— Not set —</option>
            {COUNTRIES.map(({ code, name }) => (
              <option key={code} value={code}>
                {codeToFlag(code)} {name}
              </option>
            ))}
          </select>
        </div>

        <p className="text-xs text-gray-400 mt-2">
          If set, your flag appears next to your name in the Circle.
        </p>
      </div>

      <button
        onClick={handleSave}
        disabled={status === "saving"}
        className="bg-pink-pale hover:bg-pink-dusty transition-colors text-pink-deep font-display px-6 py-3 rounded-xl2 disabled:opacity-50"
      >
        {status === "saving" ? "Saving…" : status === "saved" ? "Saved ✓" : "Save"}
      </button>
    </div>
  );
}
