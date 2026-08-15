"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Review = {
  id: string;
  rating: number;
  text: string;
  display_name_override: string | null;
  status: "pending" | "approved" | "rejected";
  is_featured: boolean;
  created_at: string;
  users: { nickname: string | null; display_name: string | null; email: string | null } | null;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const STATUS_BADGE: Record<Review["status"], string> = {
  pending: "bg-amber-100 text-amber-600",
  approved: "bg-green-soft text-green-700",
  rejected: "bg-gray-100 text-gray-500",
};

export default function ReviewsAdminList({ reviews: initialReviews }: { reviews: Review[] }) {
  const [reviews, setReviews] = useState(initialReviews);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftText, setDraftText] = useState("");
  const [draftName, setDraftName] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  async function persist(id: string, patch: Partial<Review>) {
    setBusy(id);
    const supabase = createClient();

    // reviewed_at/reviewed_by only make sense to stamp on an actual
    // status decision, not on a plain edit or a featured-toggle.
    const fullPatch: Record<string, unknown> = { ...patch };
    if (typeof patch.status === "string") {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      fullPatch.reviewed_at = new Date().toISOString();
      fullPatch.reviewed_by = user?.id ?? null;
    }

    const { error } = await supabase.from("reviews").update(fullPatch).eq("id", id);
    if (!error) {
      setReviews((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    }
    setBusy(null);
  }

  function startEdit(r: Review) {
    setEditingId(r.id);
    setDraftText(r.text);
    setDraftName(r.display_name_override ?? "");
  }

  async function saveEdit(id: string, alsoApprove: boolean) {
    await persist(id, {
      text: draftText.trim(),
      display_name_override: draftName.trim() || null,
      ...(alsoApprove ? { status: "approved" } : {}),
    });
    setEditingId(null);
  }

  if (reviews.length === 0) {
    return <p className="text-sm text-gray-400">No reviews yet.</p>;
  }

  const pending = reviews.filter((r) => r.status === "pending");
  const decided = reviews.filter((r) => r.status !== "pending");

  function renderCard(r: Review) {
    const u = r.users;
    const authorName = u?.nickname ?? u?.display_name ?? u?.email ?? "Unknown";
    const isEditing = editingId === r.id;
    const isBusy = busy === r.id;

    return (
      <div key={r.id} className="bg-white border border-pink-pale rounded-xl2 px-5 py-4">
        <p className="text-xs text-gray-400 mb-2">
          <span className="font-medium text-plum">{authorName}</span>
          {" · "}
          {r.rating} star{r.rating === 1 ? "" : "s"}
          {" · "}
          {formatDate(r.created_at)}
          <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${STATUS_BADGE[r.status]}`}>
            {r.status}
          </span>
          {r.is_featured && (
            <span className="ml-2 bg-pink-pale text-pink-deep text-xs px-1.5 py-0.5 rounded-full">
              Featured
            </span>
          )}
        </p>

        {isEditing ? (
          <div className="space-y-2 mb-3">
            <textarea
              value={draftText}
              onChange={(e) => setDraftText(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-pink-dusty bg-white"
            />
            <input
              type="text"
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              placeholder="Display name"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-pink-dusty bg-white"
            />
          </div>
        ) : (
          <p className="text-sm text-ink leading-relaxed italic mb-3">
            &ldquo;{r.text}&rdquo;
            {r.display_name_override && (
              <span className="not-italic text-gray-400">
                {" "}
                (shown as &ldquo;{r.display_name_override}&rdquo;)
              </span>
            )}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          {isEditing ? (
            <>
              <button
                onClick={() => saveEdit(r.id, false)}
                disabled={isBusy}
                className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:text-ink transition-colors disabled:opacity-50"
              >
                Save
              </button>
              <button
                onClick={() => saveEdit(r.id, true)}
                disabled={isBusy}
                className="text-xs px-3 py-1.5 rounded-lg bg-pink-pale text-pink-deep hover:bg-pink-dusty transition-colors disabled:opacity-50"
              >
                Save &amp; Approve
              </button>
              <button
                onClick={() => setEditingId(null)}
                className="text-xs px-3 py-1.5 text-gray-400 hover:text-ink transition-colors"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => startEdit(r)}
                className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:text-ink transition-colors"
              >
                Edit
              </button>
              {r.status !== "approved" && (
                <button
                  onClick={() => persist(r.id, { status: "approved" })}
                  disabled={isBusy}
                  className="text-xs px-3 py-1.5 rounded-lg bg-pink-pale text-pink-deep hover:bg-pink-dusty transition-colors disabled:opacity-50"
                >
                  Approve
                </button>
              )}
              {r.status !== "rejected" && (
                <button
                  onClick={() => persist(r.id, { status: "rejected" })}
                  disabled={isBusy}
                  className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-400 hover:text-ink transition-colors disabled:opacity-50"
                >
                  Reject
                </button>
              )}
              <button
                onClick={() => persist(r.id, { is_featured: !r.is_featured })}
                disabled={isBusy}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-50 ${
                  r.is_featured
                    ? "border-pink-dusty text-pink-deep"
                    : "border-gray-200 text-gray-400 hover:text-ink"
                }`}
              >
                {r.is_featured ? "Unfeature" : "Feature"}
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {pending.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-widest text-pink-deep mb-3">
            Pending · {pending.length}
          </p>
          <div className="space-y-3">{pending.map(renderCard)}</div>
        </div>
      )}
      {decided.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-widest text-gray-400 mb-3">
            Approved / Rejected · {decided.length}
          </p>
          <div className="space-y-3">{decided.map(renderCard)}</div>
        </div>
      )}
    </div>
  );
}
