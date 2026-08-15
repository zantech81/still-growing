"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Flag = {
  id: string;
  flagged_text: string;
  created_at: string;
  acknowledged: boolean;
  acknowledged_at: string | null;
  users: { nickname: string | null; display_name: string | null; email: string | null } | null;
  books: { title: string } | null;
  chapters: { number: number; title: string } | null;
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function SelfHarmFlagsList({ flags: initialFlags }: { flags: Flag[] }) {
  const [flags, setFlags] = useState(initialFlags);
  const [acking, setAcking] = useState<string | null>(null);

  async function acknowledge(id: string) {
    setAcking(id);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setAcking(null);
      return;
    }

    const nowIso = new Date().toISOString();
    const { error } = await supabase
      .from("self_harm_flags")
      .update({ acknowledged: true, acknowledged_at: nowIso, acknowledged_by: user.id })
      .eq("id", id);

    if (!error) {
      setFlags((prev) =>
        prev.map((f) => (f.id === id ? { ...f, acknowledged: true, acknowledged_at: nowIso } : f))
      );
    }
    setAcking(null);
  }

  if (flags.length === 0) {
    return <p className="text-sm text-gray-400">No flags yet.</p>;
  }

  // Unacknowledged first (the whole reason this list exists is to surface
  // what still needs a human to look at it), acknowledged kept below as a
  // record rather than hidden entirely.
  const unacknowledged = flags.filter((f) => !f.acknowledged);
  const acknowledged = flags.filter((f) => f.acknowledged);

  return (
    <div className="space-y-8">
      {unacknowledged.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-widest text-pink-deep mb-3">
            Needs review · {unacknowledged.length}
          </p>
          <div className="space-y-3">
            {unacknowledged.map((f) => (
              <FlagCard key={f.id} flag={f} onAcknowledge={acknowledge} acking={acking === f.id} />
            ))}
          </div>
        </div>
      )}

      {acknowledged.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-widest text-gray-400 mb-3">
            Acknowledged · {acknowledged.length}
          </p>
          <div className="space-y-3">
            {acknowledged.map((f) => (
              <FlagCard key={f.id} flag={f} onAcknowledge={acknowledge} acking={false} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function FlagCard({
  flag,
  onAcknowledge,
  acking,
}: {
  flag: Flag;
  onAcknowledge: (id: string) => void;
  acking: boolean;
}) {
  const u = flag.users;
  const name = u?.nickname ?? u?.display_name ?? u?.email ?? "Unknown";
  const secondaryName = u?.nickname ? u.display_name ?? u.email : null;

  return (
    <div
      className={`bg-white border rounded-xl2 px-5 py-4 ${
        flag.acknowledged ? "border-gray-200 opacity-60" : "border-pink-deep"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-400 mb-2">
            <span className="font-medium text-plum">{name}</span>
            {secondaryName && <span className="ml-1 text-gray-300 font-normal">({secondaryName})</span>}
            {" · "}
            {/* No book means this came from a Review submission, not a
                reflection (see supabase/migrations/0043_self_harm_flags.sql
                and app/api/reviews/route.ts) -- there's no chapter context
                to show for those. */}
            {flag.books ? (
              <>
                {flag.books.title}
                {flag.chapters && (
                  <>
                    {" · Ch. "}
                    {flag.chapters.number}: {flag.chapters.title}
                  </>
                )}
              </>
            ) : (
              "Review submission"
            )}
            {" · "}
            {formatDateTime(flag.created_at)}
          </p>
          <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap">{flag.flagged_text}</p>
        </div>
        {flag.acknowledged ? (
          <span className="flex-shrink-0 text-xs text-gray-400 px-3 py-1.5 text-right">
            Acknowledged
            {flag.acknowledged_at && (
              <>
                <br />
                {formatDateTime(flag.acknowledged_at)}
              </>
            )}
          </span>
        ) : (
          <button
            onClick={() => onAcknowledge(flag.id)}
            disabled={acking}
            className="flex-shrink-0 text-xs px-3 py-1.5 rounded-lg border border-pink-dusty text-pink-deep hover:bg-pink-pale transition-colors disabled:opacity-50"
          >
            {acking ? "…" : "Acknowledge"}
          </button>
        )}
      </div>
    </div>
  );
}
