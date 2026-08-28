"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Props = {
  initialActive: boolean;
  initialMessage: string;
  initialLink: string;
};

// Same shape as MaintenanceToggle.tsx (site_settings is the shared home
// for both -- see 0055_site_settings_announcement.sql's comment on why).
// A manual save here overwrites whatever's currently stored, including
// an announcement that a Grove post publish auto-activated -- that's the
// intended override path the punch-list item asked for, not a bug.
export default function AnnouncementToggle({ initialActive, initialMessage, initialLink }: Props) {
  const [active, setActive] = useState(initialActive);
  const [message, setMessage] = useState(initialMessage);
  const [link, setLink] = useState(initialLink);
  const [savedActive, setSavedActive] = useState(initialActive);
  const [savedMessage, setSavedMessage] = useState(initialMessage);
  const [savedLink, setSavedLink] = useState(initialLink);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const dirty = active !== savedActive || message !== savedMessage || link !== savedLink;

  async function save() {
    if (active && !message.trim()) {
      setError("Write a message for readers to see, or turn the announcement off.");
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
        announcement_active: active,
        announcement_message: message.trim() || null,
        announcement_link: link.trim() || null,
        updated_at: new Date().toISOString(),
        updated_by: user?.id ?? null,
      })
      .eq("id", 1);

    setSaving(false);
    if (updateError) {
      setError("Save failed. Try again.");
      return;
    }
    setSavedActive(active);
    setSavedMessage(message);
    setSavedLink(link);
  }

  function clear() {
    setActive(false);
    setMessage("");
    setLink("");
  }

  return (
    <div
      className={`rounded-xl2 border p-5 mb-10 transition-colors ${
        savedActive ? "bg-pink-pale/60 border-pink-dusty" : "bg-white border-pink-pale"
      }`}
    >
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <p className="font-medium text-plum">Announcement banner</p>
          <p className="text-sm text-gray-400 mt-0.5">
            {savedActive
              ? "Live now — shown once per session to every signed-in reader."
              : "Off — nothing showing. Auto-activates when you publish a new Grove post."}
          </p>
        </div>
        <label className="flex items-center gap-2 cursor-pointer flex-shrink-0">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            className="sr-only peer"
          />
          <span className="w-11 h-6 rounded-full bg-gray-200 peer-checked:bg-pink-deep transition-colors relative">
            <span className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform peer-checked:translate-x-5" />
          </span>
        </label>
      </div>

      <label className="text-xs uppercase tracking-widest text-gray-400 block mb-1.5">Message</label>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={2}
        placeholder="New in the Grove: a new chapter reflection video"
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-pink-dusty transition-colors bg-white mb-3"
      />

      <label className="text-xs uppercase tracking-widest text-gray-400 block mb-1.5">
        Link <span className="normal-case tracking-normal text-gray-300">(optional)</span>
      </label>
      <input
        type="text"
        value={link}
        onChange={(e) => setLink(e.target.value)}
        placeholder="/grove"
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
        <button
          onClick={clear}
          disabled={saving}
          className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:text-ink transition-colors disabled:opacity-50"
        >
          Clear
        </button>
        {dirty && !saving && <span className="text-xs text-gray-400">Unsaved changes</span>}
      </div>
    </div>
  );
}
