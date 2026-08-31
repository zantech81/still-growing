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
};

export default function GrovePostForm({ post }: { post?: Post }) {
  const router = useRouter();
  const isEdit = !!post;

  const [title, setTitle] = useState(post?.title ?? "");
  const [body, setBody] = useState(post?.body ?? "");
  const [saving, setSaving] = useState<"draft" | "publish" | null>(null);
  const [error, setError] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  async function save(publish: boolean) {
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    if (!body.trim()) {
      setError("Write something for the body.");
      return;
    }
    setError("");
    setSaving(publish ? "publish" : "draft");

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const wasPublished = post?.status === "published";
    const nowPublishing = publish && !wasPublished;

    const payload = {
      title: title.trim(),
      body: body.trim(),
      status: publish ? "published" : "draft",
      ...(nowPublishing ? { published_at: new Date().toISOString() } : {}),
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
    // auto-activate the sitewide announcement to point at it. A manually
    // set announcement is deliberately overwritten here: the punch-list
    // item asks for exactly this ("references that post ... so readers
    // see 'new post in the Grove' without the admin separately going to
    // set an announcement"), and the admin can always re-edit or clear it
    // afterward from the dashboard's Announcement control.
    if (nowPublishing) {
      await supabase
        .from("site_settings")
        .update({
          announcement_active: true,
          announcement_message: `New in the Grove: "${savedPost.title}"`,
          announcement_link: `/grove#${savedPost.id}`,
          updated_at: new Date().toISOString(),
          updated_by: user?.id ?? null,
        })
        .eq("id", 1);
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

      {error && <p className="text-sm text-pink-deep">{error}</p>}

      <div className="flex gap-3 pt-2">
        <button
          onClick={() => save(false)}
          disabled={saving !== null}
          className="px-6 py-2.5 rounded-xl2 text-sm border border-gray-200 text-gray-500 hover:text-ink transition-colors disabled:opacity-50"
        >
          {saving === "draft" ? "Saving…" : "Save draft"}
        </button>
        <button
          onClick={() => save(true)}
          disabled={saving !== null}
          className="bg-plum text-white px-6 py-2.5 rounded-xl2 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {saving === "publish" ? "Publishing…" : post?.status === "published" ? "Save changes" : "Publish"}
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
