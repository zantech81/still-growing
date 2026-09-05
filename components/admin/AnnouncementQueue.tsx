"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { COUNTRIES } from "@/lib/countries";

type Announcement = {
  id: string;
  message: string;
  link: string | null;
  country_codes: string[] | null;
  starts_at: string;
  ends_at: string | null;
  status: "scheduled" | "active" | "ended" | "cancelled";
  created_at: string;
};

type Props = {
  initialAnnouncements: Announcement[];
};

const STATUS_BADGE: Record<Announcement["status"], string> = {
  scheduled: "bg-blue-soft text-plum",
  active: "bg-green-soft text-plum",
  ended: "bg-gray-100 text-gray-500",
  cancelled: "bg-gray-100 text-gray-400",
};

const STATUS_LABEL: Record<Announcement["status"], string> = {
  scheduled: "Scheduled",
  active: "Active",
  ended: "Ended",
  cancelled: "Cancelled",
};

function todayDateString() {
  return new Date().toISOString().slice(0, 10);
}

// scheduled_for/starts_at/ends_at are plain "YYYY-MM-DD" dates, not
// timestamps -- parsed as UTC noon rather than UTC midnight so a
// negative-UTC-offset browser timezone doesn't roll the displayed date
// back a day, same fix as GrovePostForm.tsx's own date formatter.
function formatDate(isoDate: string) {
  return new Date(`${isoDate}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function countryScopeLabel(codes: string[] | null) {
  if (!codes?.length) return "Worldwide";
  if (codes.length <= 3) return codes.join(", ");
  return `${codes.slice(0, 3).join(", ")} +${codes.length - 3} more`;
}

// Replaces the old singleton AnnouncementToggle.tsx: a real queue
// (scheduled_announcements, 0062_scheduled_announcements.sql) rather than
// one admin-editable row, so more than one announcement can exist -- a
// sitewide one and a country-scoped one at once, a future one queued
// behind a currently-active one, a past one kept for the record instead
// of being overwritten. The daily cron (app/api/cron/scheduled-content)
// handles both day-boundary transitions (scheduled -> active,
// active -> ended) on its own; this component's own actions are only the
// ones a schedule can't predict -- cancelling before a scheduled one ever
// goes live, or ending an active one early.
export default function AnnouncementQueue({ initialAnnouncements }: Props) {
  const [announcements, setAnnouncements] = useState(initialAnnouncements);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<{ id: string; message: string } | null>(null);

  const [message, setMessage] = useState("");
  const [link, setLink] = useState("");
  const [countryCodes, setCountryCodes] = useState<string[]>([]);
  const [startsAt, setStartsAt] = useState(todayDateString());
  const [endsAt, setEndsAt] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  async function createAnnouncement() {
    if (!message.trim()) {
      setCreateError("Write a message for readers to see.");
      return;
    }
    setCreating(true);
    setCreateError("");

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // A row whose starts_at is already today (or in the past, though the
    // date input's min= prevents picking one) goes live immediately
    // rather than waiting for tomorrow's cron tick -- "just turn one on
    // right now" is meant to actually mean right now.
    const status = startsAt <= todayDateString() ? "active" : "scheduled";

    const { data: created, error } = await supabase
      .from("scheduled_announcements")
      .insert({
        message: message.trim(),
        link: link.trim() || null,
        country_codes: countryCodes.length > 0 ? countryCodes : null,
        starts_at: startsAt,
        ends_at: endsAt || null,
        status,
        created_by: user?.id ?? null,
      })
      .select("id, message, link, country_codes, starts_at, ends_at, status, created_at")
      .single();

    setCreating(false);
    if (error || !created) {
      setCreateError(error?.message ?? "Save failed. Try again.");
      return;
    }

    setAnnouncements((prev) => [created as Announcement, ...prev]);
    setMessage("");
    setLink("");
    setCountryCodes([]);
    setStartsAt(todayDateString());
    setEndsAt("");
  }

  async function updateStatus(id: string, status: "cancelled" | "ended") {
    setProcessingId(id);
    setRowError(null);

    const supabase = createClient();
    const { error } = await supabase.from("scheduled_announcements").update({ status }).eq("id", id);

    setProcessingId(null);
    if (error) {
      setRowError({ id, message: "Update failed. Try again." });
      return;
    }
    setAnnouncements((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
  }

  return (
    <div className="rounded-xl2 border border-pink-pale bg-white p-5 mb-10">
      <p className="font-medium text-plum">Announcements</p>
      <p className="text-sm text-gray-400 mt-0.5 mb-4">
        Shown sitewide, or scoped to specific countries. Publishing a Grove post adds one here automatically.
      </p>

      {announcements.length === 0 ? (
        <p className="text-sm text-gray-400 mb-5">No announcements yet.</p>
      ) : (
        <div className="space-y-2 mb-5">
          {announcements.map((a) => (
            <div key={a.id} className="border border-gray-100 rounded-lg px-4 py-3 flex items-start gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[a.status]}`}>
                    {STATUS_LABEL[a.status]}
                  </span>
                  <span className="text-xs text-gray-400">{countryScopeLabel(a.country_codes)}</span>
                  <span className="text-xs text-gray-300">
                    {formatDate(a.starts_at)}
                    {a.ends_at ? ` – ${formatDate(a.ends_at)}` : ""}
                  </span>
                </div>
                <p className="text-sm text-ink truncate">{a.message}</p>
                {a.link && <p className="text-xs text-gray-400 truncate">{a.link}</p>}
                {rowError?.id === a.id && <p className="text-xs text-pink-deep mt-1">{rowError.message}</p>}
              </div>
              <div className="flex-shrink-0">
                {a.status === "scheduled" && (
                  <button
                    onClick={() => updateStatus(a.id, "cancelled")}
                    disabled={processingId === a.id}
                    className="text-xs px-2.5 py-1 rounded-lg border border-pink-deep text-pink-deep hover:bg-pink-pale transition-colors disabled:opacity-50"
                  >
                    {processingId === a.id ? "…" : "Cancel"}
                  </button>
                )}
                {a.status === "active" && (
                  <button
                    onClick={() => updateStatus(a.id, "ended")}
                    disabled={processingId === a.id}
                    className="text-xs px-2.5 py-1 rounded-lg border border-pink-deep text-pink-deep hover:bg-pink-pale transition-colors disabled:opacity-50"
                  >
                    {processingId === a.id ? "…" : "End now"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="border-t border-gray-100 pt-4">
        <p className="text-xs uppercase tracking-widest text-gray-400 mb-3">New announcement</p>

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
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-pink-dusty transition-colors bg-white mb-3"
        />

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="text-xs uppercase tracking-widest text-gray-400 block mb-1.5">Starts</label>
            <input
              type="date"
              value={startsAt}
              min={todayDateString()}
              onChange={(e) => setStartsAt(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-pink-dusty transition-colors bg-white"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest text-gray-400 block mb-1.5">
              Ends <span className="normal-case tracking-normal text-gray-300">(optional)</span>
            </label>
            <input
              type="date"
              value={endsAt}
              min={startsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-pink-dusty transition-colors bg-white"
            />
          </div>
        </div>

        <label className="text-xs uppercase tracking-widest text-gray-400 block mb-1.5">
          Countries <span className="normal-case tracking-normal text-gray-300">(leave empty for worldwide)</span>
        </label>
        <select
          multiple
          value={countryCodes}
          onChange={(e) => setCountryCodes(Array.from(e.target.selectedOptions, (o) => o.value))}
          size={6}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-pink-dusty transition-colors bg-white mb-1"
        >
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </select>
        <p className="text-xs text-gray-400 mb-3">Hold Cmd/Ctrl to select more than one.</p>

        {createError && <p className="text-sm text-pink-deep mb-2">{createError}</p>}

        <button
          onClick={createAnnouncement}
          disabled={creating}
          className="bg-plum text-white px-5 py-2 rounded-xl2 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {creating ? "Saving…" : "Add announcement"}
        </button>
      </div>
    </div>
  );
}
