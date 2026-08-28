"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

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
  const [mediaUrl, setMediaUrl] = useState(post?.media_url ?? "");
  const [saving, setSaving] = useState<"draft" | "publish" | null>(null);
  const [error, setError] = useState("");

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
      media_url: mediaUrl.trim() || null,
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

  return (
    <div className="space-y-6 max-w-xl">
      <Field label="Title" required>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={input()}
          placeholder="A new chapter, off the page"
        />
      </Field>

      <Field label="Body" hint="Markdown supported -- headings, bold, links, lists.">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={10}
          className={`${input()} font-mono`}
          placeholder="Write the post..."
        />
      </Field>

      <Field
        label="Media URL"
        hint="Optional. A YouTube link (any common form) embeds as a player; an image URL (.jpg/.png/.webp/...) shows inline; anything else falls back to a plain link."
      >
        <input
          type="text"
          value={mediaUrl}
          onChange={(e) => setMediaUrl(e.target.value)}
          className={input()}
          placeholder="https://youtube.com/watch?v=..."
        />
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
