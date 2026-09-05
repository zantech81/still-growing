"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { deleteGrovePost } from "@/lib/grove";
import GroveEditor from "./grove-editor/GroveEditor";

type Post = {
  id: string;
  title: string;
  body: string;
  media_url: string | null;
  status: "draft" | "published";
  scheduled_for: string | null;
};

function todayDateString() {
  return new Date().toISOString().slice(0, 10);
}

function formatDateForDisplay(isoDate: string) {
  // Parsed as UTC noon, not midnight -- a plain "YYYY-MM-DD" parses as UTC
  // midnight, which toLocaleDateString in a negative-UTC-offset timezone
  // would then roll back to the previous calendar day. Noon has enough
  // margin either direction to always land on the intended date.
  return new Date(`${isoDate}T12:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function GrovePostForm({ post }: { post?: Post }) {
  const router = useRouter();
  const isEdit = !!post;

  const [title, setTitle] = useState(post?.title ?? "");
  const [body, setBody] = useState(post?.body ?? "");
  const [scheduledFor, setScheduledFor] = useState(post?.scheduled_for ?? "");
  const [saving, setSaving] = useState<"draft" | "publish" | "schedule" | null>(null);
  const [error, setError] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const alreadyPublished = post?.status === "published";

  async function save(mode: "draft" | "publish" | "schedule") {
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    if (!body.trim()) {
      setError("Write something for the body.");
      return;
    }
    if (mode === "schedule" && !scheduledFor) {
      setError("Pick a date to schedule for.");
      return;
    }
    setError("");
    setSaving(mode);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const wasPublished = post?.status === "published";
    const nowPublishing = mode === "publish" && !wasPublished;

    const payload: {
      title: string;
      body: string;
      status: "draft" | "published";
      published_at?: string;
      scheduled_for?: string | null;
    } = {
      title: title.trim(),
      body: body.trim(),
      status: mode === "publish" ? "published" : "draft",
      // "Save draft" leaves scheduled_for untouched entirely (a content
      // tweak to an already-scheduled post shouldn't silently cancel the
      // schedule) -- only "Schedule" sets it, and publishing clears it
      // (no longer pending once it's actually live).
      ...(mode === "schedule" ? { scheduled_for: scheduledFor } : {}),
      ...(nowPublishing ? { published_at: new Date().toISOString(), scheduled_for: null } : {}),
    };

    const { data: savedPost, error: saveError } = isEdit
      ? await supabase.from("grove_posts").update(payload).eq("id", post.id).select("id, title").single()
      : await supabase
          .from("grove_posts")
          .insert({ ...payload, created_by: user?.id ?? null })
          .select("id, title")
          .single();

    if (saveError || !savedPost) {
      setSaving(null);
      setError(saveError?.message ?? "Save failed. Try again.");
      return;
    }

    // Newly publishing (not just editing an already-published post) --
    // create a sitewide announcement row pointing at it. A manually set
    // announcement is deliberately not touched here: unlike the old
    // site_settings singleton this used to overwrite, the queue can hold
    // more than one row, so this just adds a new active one alongside
    // whatever else is running rather than clobbering it. The admin can
    // still cancel/end this one from the dashboard's queue manager.
    // Mirrors exactly what the scheduled-publish cron does for a
    // scheduled post reaching its date (lib/notifications.ts's
    // publishScheduledGrovePosts).
    if (nowPublishing) {
      await supabase.from("scheduled_announcements").insert({
        message: `New in the Grove: "${savedPost.title}"`,
        link: `/grove#${savedPost.id}`,
        country_codes: null,
        starts_at: todayDateString(),
        status: "active",
        created_by: user?.id ?? null,
      });

      // Not awaited, with keepalive: same reliability reasoning as
      // app/auth/welcome/page.tsx's sync-contact call -- waitUntil
      // doesn't reliably survive in this project's Vercel deployment
      // (see commits f9ab3e9->d5dadbe), so a batched send to every
      // reader can't rely on continuing after this response returns.
      // keepalive lets the request survive the router.push below rather
      // than being cancelled when this component unmounts. Deliberately
      // not blocking the redirect either (unlike BookForm.tsx's awaited
      // notify-book-launch call): the post is already published and the
      // announcement already live by this point regardless of how long
      // the email send takes, and Grove is expected to be published far
      // more often than a book ever launches -- waiting on a bulk send
      // every time would make an increasingly routine action feel slow
      // for no benefit to the admin.
      fetch("/api/admin/notify-grove-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: savedPost.id }),
        keepalive: true,
      }).catch(console.error);
    }

    setSaving(null);
    router.push("/admin/grove");
    router.refresh();
  }

  async function handleDelete() {
    if (!post) return;
    setDeleting(true);
    setDeleteError("");
    const { error: deleteErr } = await deleteGrovePost(post.id);
    if (deleteErr) {
      setDeleting(false);
      setDeleteError(deleteErr);
      return;
    }
    router.push("/admin/grove");
    router.refresh();
  }

  return (
    // max-w-2xl, not the old max-w-xl: matches app/grove/page.tsx's own
    // content column width, so the editor's wrapping roughly previews
    // how the body will actually read on the public page.
    <div className="space-y-6 max-w-2xl">
      <Field label="Title" required>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={input()}
          placeholder="A new chapter, off the page"
        />
      </Field>

      <Field label="Body">
        <GroveEditor initialValue={body} onChange={setBody} />
      </Field>

      {/* Scheduling only makes sense pre-publish -- an already-published
          post has no "not yet public" state left to schedule into. */}
      {!alreadyPublished && (
        <Field label="Schedule for later" hint="Leave blank to save as a plain draft or publish right away.">
          <div className="flex items-center gap-3">
            <input
              type="date"
              value={scheduledFor}
              min={todayDateString()}
              onChange={(e) => setScheduledFor(e.target.value)}
              className={input() + " w-auto"}
            />
            <button
              onClick={() => save("schedule")}
              disabled={saving !== null}
              className="px-5 py-2 rounded-xl2 text-sm border border-pink-dusty text-pink-deep hover:bg-pink-pale transition-colors disabled:opacity-50 whitespace-nowrap"
            >
              {saving === "schedule" ? "Scheduling…" : post?.scheduled_for ? "Update schedule" : "Schedule"}
            </button>
          </div>
          {post?.scheduled_for && (
            <p className="text-xs text-gray-400 mt-1.5">
              Currently scheduled to publish on {formatDateForDisplay(post.scheduled_for)}. The daily cron picks
              this up once the date arrives.
            </p>
          )}
        </Field>
      )}

      {error && <p className="text-sm text-pink-deep">{error}</p>}

      <div className="flex gap-3 pt-2">
        <button
          onClick={() => save("draft")}
          disabled={saving !== null}
          className="px-6 py-2.5 rounded-xl2 text-sm border border-gray-200 text-gray-500 hover:text-ink transition-colors disabled:opacity-50"
        >
          {saving === "draft" ? "Saving…" : "Save draft"}
        </button>
        <button
          onClick={() => save("publish")}
          disabled={saving !== null}
          className="bg-plum text-white px-6 py-2.5 rounded-xl2 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {saving === "publish" ? "Publishing…" : post?.status === "published" ? "Save changes" : "Publish now"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-2.5 rounded-xl2 text-sm text-gray-400 hover:text-ink transition-colors"
        >
          Cancel
        </button>
      </div>

      {isEdit && (
        <div className="pt-6 border-t border-gray-100">
          {!confirmingDelete ? (
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              className="text-xs px-3 py-1.5 rounded-lg border border-pink-deep text-pink-deep hover:bg-pink-pale transition-colors"
            >
              Delete post
            </button>
          ) : (
            <div className="max-w-md">
              <p className="text-xs text-pink-deep mb-2">
                Delete "{post.title}"? This permanently removes the post, its reactions, and
                (if it's the current sitewide announcement) turns that announcement off. This
                cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="text-xs px-3 py-1.5 rounded-lg bg-pink-deep text-white hover:bg-plum transition-colors disabled:opacity-50"
                >
                  {deleting ? "Deleting…" : "Confirm delete"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(false)}
                  disabled={deleting}
                  className="text-xs px-3 py-1.5 text-gray-400 hover:text-ink transition-colors"
                >
                  Cancel
                </button>
              </div>
              {deleteError && <p className="text-xs text-pink-deep mt-2">{deleteError}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function input() {
  return "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-pink-dusty transition-colors bg-white";
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-xs uppercase tracking-widest text-gray-400 block mb-1.5">
        {label}
        {required && <span className="text-pink-deep ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}
