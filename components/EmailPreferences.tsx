"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Props = {
  initialReaction: boolean;
  initialRootFor: boolean;
  initialNewBook: boolean;
  initialBirthday: boolean;
  initialGrovePost: boolean;
};

// unlock_alert has no toggle here on purpose -- it's never sent to a
// reader (hardcoded to admin@stillgrowing.co, app/api/cron/unlock-alert),
// so there's nothing for a reader to opt out of.
//
// One "Save" button for all five, not five independently auto-saving
// toggles -- same shape as MaintenanceToggle/AnnouncementToggle
// (components/admin/), built on the corrected sliding-knob version
// (dd3a331), not the pre-fix pattern: the knob's translate is driven
// directly from state rather than a peer-checked pseudo-class, since
// peer-checked only reaches a direct sibling of the checkbox, not a
// nested descendant.
export default function EmailPreferences({
  initialReaction,
  initialRootFor,
  initialNewBook,
  initialBirthday,
  initialGrovePost,
}: Props) {
  const [reaction, setReaction] = useState(initialReaction);
  const [rootFor, setRootFor] = useState(initialRootFor);
  const [newBook, setNewBook] = useState(initialNewBook);
  const [birthday, setBirthday] = useState(initialBirthday);
  const [grovePost, setGrovePost] = useState(initialGrovePost);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const dirty =
    reaction !== initialReaction ||
    rootFor !== initialRootFor ||
    newBook !== initialNewBook ||
    birthday !== initialBirthday ||
    grovePost !== initialGrovePost;

  async function save() {
    setSaving(true);
    setError("");
    setSaved(false);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error: updateError } = await supabase
      .from("users")
      .update({
        notify_reaction: reaction,
        notify_root_for: rootFor,
        notify_new_book: newBook,
        notify_birthday: birthday,
        notify_grove_post: grovePost,
      })
      .eq("id", user.id);

    setSaving(false);
    if (updateError) {
      setError("Something went wrong. Please try again.");
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="bg-white border border-pink-pale rounded-xl2 p-5">
      <p className="font-display text-plum mb-1">Email preferences</p>
      <p className="text-sm text-gray-400 mb-4">
        These only affect email. You'll still see everything in your notification bell either way.
      </p>

      <div className="space-y-3">
        <ToggleRow label="Email me when someone reacts to my reflection" checked={reaction} onChange={setReaction} />
        <ToggleRow label="Email me when someone roots for me" checked={rootFor} onChange={setRootFor} />
        <ToggleRow label="Email me when a new book is added to my library" checked={newBook} onChange={setNewBook} />
        <ToggleRow label="Email me a birthday message" checked={birthday} onChange={setBirthday} />
        <ToggleRow label="Email me when there's a new Grove post" checked={grovePost} onChange={setGrovePost} />
      </div>

      {error && <p className="text-sm text-pink-deep mt-3">{error}</p>}

      <div className="flex items-center gap-3 mt-5">
        <button
          onClick={save}
          disabled={saving || !dirty}
          className="bg-pink-pale hover:bg-pink-dusty transition-colors text-pink-deep font-display px-5 py-2.5 rounded-xl2 disabled:opacity-50"
        >
          {saving ? "Saving…" : saved ? "Saved ✓" : "Save"}
        </button>
        {dirty && !saving && !saved && <span className="text-xs text-gray-400">Unsaved changes</span>}
      </div>
    </div>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-4 cursor-pointer">
      <span className="text-sm text-ink">{label}</span>
      <span className="flex items-center flex-shrink-0">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only peer"
        />
        <span className="w-11 h-6 rounded-full bg-gray-200 peer-checked:bg-pink-deep transition-colors relative">
          {/* peer-checked only reaches a direct sibling of the checkbox,
              not this nested knob -- driven directly from `checked`
              instead, same fix as dd3a331 applied to
              MaintenanceToggle/AnnouncementToggle. */}
          <span
            className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
              checked ? "translate-x-5" : ""
            }`}
          />
        </span>
      </span>
    </label>
  );
}
