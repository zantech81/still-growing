"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Props = {
  initialEnabled: boolean;
  initialMessage: string;
};

// Placed at the top of the admin dashboard (app/admin/page.tsx), not
// tucked into a content-specific page like /admin/books or /admin/reviews
// -- a site-wide gate that locks out every reader is the kind of control
// that should be impossible to miss, not something you have to already
// know to go looking for.
export default function MaintenanceToggle({ initialEnabled, initialMessage }: Props) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [message, setMessage] = useState(initialMessage);
  const [savedEnabled, setSavedEnabled] = useState(initialEnabled);
  const [savedMessage, setSavedMessage] = useState(initialMessage);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const dirty = enabled !== savedEnabled || message !== savedMessage;

  async function save() {
    // maintenance_message is NOT NULL at the DB level (see
    // 0051_site_settings.sql) -- readers always need something to see
    // once this is on, so an empty message is rejected here rather than
    // silently falling back to a default the admin didn't choose.
    if (!message.trim()) {
      setError("Write a message for readers to see, or leave the last one in place.");
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
        maintenance_mode: enabled,
        maintenance_message: message.trim(),
        updated_at: new Date().toISOString(),
        updated_by: user?.id ?? null,
      })
      .eq("id", 1);

    setSaving(false);
    if (updateError) {
      setError("Save failed. Try again.");
      return;
    }
    setSavedEnabled(enabled);
    setSavedMessage(message);
  }

  return (
    <div
      className={`rounded-xl2 border p-5 mb-10 transition-colors ${
        savedEnabled ? "bg-pink-pale/60 border-pink-dusty" : "bg-white border-pink-pale"
      }`}
    >
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <p className="font-medium text-plum">Maintenance mode</p>
          <p className="text-sm text-gray-400 mt-0.5">
            {savedEnabled
              ? "Live now — every reader-facing page redirects to the maintenance page. Admin stays reachable."
              : "Off — the site is running normally."}
          </p>
        </div>
        <label className="flex items-center gap-2 cursor-pointer flex-shrink-0">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="sr-only peer"
          />
          <span className="w-11 h-6 rounded-full bg-gray-200 peer-checked:bg-pink-deep transition-colors relative">
            <span className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform peer-checked:translate-x-5" />
          </span>
        </label>
      </div>

      <label className="text-xs uppercase tracking-widest text-gray-400 block mb-1.5">
        Message shown to readers
      </label>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={2}
        placeholder="We're making some improvements and will be back shortly. Thanks for your patience!"
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-pink-dusty transition-colors bg-white"
      />

      {error && <p className="text-sm text-pink-deep mt-2">{error}</p>}

      <div className="flex items-center gap-3 mt-3">
        <button
          onClick={save}
          disabled={saving || !dirty}
          className="bg-plum text-white px-5 py-2 rounded-xl2 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        {dirty && !saving && <span className="text-xs text-gray-400">Unsaved changes</span>}
      </div>
    </div>
  );
}
