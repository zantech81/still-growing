"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Props = {
  initialThreshold: number;
};

// Same save-a-single-site_settings-field pattern as MaintenanceToggle.tsx/
// AnnouncementToggle.tsx -- a plain number here rather than a toggle,
// since this isn't on/off, it's the tunable "how many is abnormal"
// input the cron (app/api/cron/unlock-alert) and the live dashboard
// banner (UnlockClusterAlertBanner, both via lib/unlockAlerts.ts) both
// read. Default of 10 was grounded in this project's real unlock data
// at the time (see 0059_unlock_cluster_alert.sql's comment) -- admin-
// editable here rather than hardcoded so it can be raised as real
// traffic grows instead of firing on ordinary busy days.
export default function UnlockAlertThresholdSetting({ initialThreshold }: Props) {
  const [threshold, setThreshold] = useState(String(initialThreshold));
  const [saved, setSaved] = useState(initialThreshold);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const parsed = Number(threshold);
  const valid = Number.isInteger(parsed) && parsed > 0;
  const dirty = parsed !== saved;

  async function save() {
    if (!valid) {
      setError("Enter a whole number greater than 0.");
      return;
    }
    setSaving(true);
    setError("");

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error: updateError } = await supabase
      .from("site_settings")
      .update({
        unlock_alert_threshold: parsed,
        updated_at: new Date().toISOString(),
        updated_by: user?.id ?? null,
      })
      .eq("id", 1);

    setSaving(false);
    if (updateError) {
      setError("Save failed. Try again.");
      return;
    }
    setSaved(parsed);
  }

  return (
    <div className="rounded-xl2 border border-pink-pale bg-white p-5 mb-10">
      <p className="font-medium text-plum">Unlock cluster alert threshold</p>
      <p className="text-sm text-gray-400 mt-0.5 mb-3">
        Alert when a book's unverified unlocks in a 24-hour window reach this number.
      </p>
      <div className="flex items-center gap-3">
        <input
          type="number"
          min={1}
          step={1}
          value={threshold}
          onChange={(e) => setThreshold(e.target.value)}
          className="w-24 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-pink-dusty transition-colors bg-white"
        />
        <button
          onClick={save}
          disabled={saving || !dirty || !valid}
          className="bg-plum text-white px-5 py-2 rounded-xl2 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        {dirty && valid && !saving && <span className="text-xs text-gray-400">Unsaved changes</span>}
      </div>
      {error && <p className="text-sm text-pink-deep mt-2">{error}</p>}
    </div>
  );
}
