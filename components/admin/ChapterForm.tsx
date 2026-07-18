"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import MuxUploader from "@/components/admin/MuxUploader";

type ChapterData = {
  id: string;
  number: number;
  title: string;
  milestone_label: string | null;
  reflect_question: string | null;
  challenge_text: string | null;
  mux_playback_id: string | null;
  unlock_code: string | null;
};

type BadgeData = {
  id: string;
  name: string;
  icon: string | null;
  description: string | null;
  badge_image_url: string | null;
};

type Props = {
  bookId: string;
  chapter?: ChapterData;
  badge?: BadgeData | null;
};

// Maps a chapters-table save error to inline field errors. 23505 (unique
// violation) gets a friendly message distinguishing which column collided;
// anything else surfaces the raw Postgres code/message/hint directly, since
// the admin is the only user of this form and a swallowed error code is
// exactly what turned the unlock_code migration gap into a live-DB
// investigation instead of a one-glance diagnosis.
function chapterSaveError(err: { code?: string; message: string; hint?: string | null }): Record<string, string> {
  if (err.code === "23505") {
    const isUnlockCode = err.message.includes("unlock_code");
    return {
      form: isUnlockCode ? "" : "Chapter number already exists in this book.",
      unlockCode: isUnlockCode ? "This unlock code is already used by another chapter in this book." : "",
    };
  }
  return {
    form: `Save failed (${err.code ?? "unknown"}): ${err.message}${err.hint ? `. ${err.hint}` : ""}`,
  };
}

export default function ChapterForm({ bookId, chapter, badge }: Props) {
  const router = useRouter();
  const isEdit = !!chapter;
  const badgeImageInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    number: chapter?.number?.toString() ?? "",
    title: chapter?.title ?? "",
    milestoneLabel: chapter?.milestone_label ?? "",
    reflectQuestion: chapter?.reflect_question ?? "",
    challengeText: chapter?.challenge_text ?? "",
    muxPlaybackId: chapter?.mux_playback_id ?? "",
    unlockCode: chapter?.unlock_code ?? "",
    badgeName: badge?.name ?? "",
    badgeIcon: badge?.icon ?? "",
    badgeDescription: badge?.description ?? "",
    badgeImageUrl: badge?.badge_image_url ?? "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [uploadingBadgeImage, setUploadingBadgeImage] = useState(false);

  function set(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: "" }));
  }

  async function handleBadgeImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    const ext = file.name.split(".").pop() ?? "png";
    const path = `badges/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    setUploadingBadgeImage(true);
    setErrors((err) => ({ ...err, badgeImageUrl: "" }));

    const supabase = createClient();
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("book-covers")
      .upload(path, file, { upsert: false });

    if (uploadError || !uploadData) {
      setUploadingBadgeImage(false);
      setErrors((err) => ({
        ...err,
        badgeImageUrl: uploadError?.message ? `Upload failed: ${uploadError.message}` : "Upload failed. Try again.",
      }));
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from("book-covers").getPublicUrl(uploadData.path);
    set("badgeImageUrl", publicUrl);
    setUploadingBadgeImage(false);
  }

  async function handleSave() {
    if (!form.number || !form.title || !form.reflectQuestion.trim() || !form.challengeText.trim() || !form.badgeName) {
      setErrors({
        number: form.number ? "" : "Chapter number is required.",
        title: form.title ? "" : "Title is required.",
        reflectQuestion: form.reflectQuestion.trim() ? "" : "Reflection question is required.",
        challengeText: form.challengeText.trim() ? "" : "Challenge is required.",
        badgeName: form.badgeName ? "" : "Badge name is required.",
      });
      return;
    }

    const chapterNumber = parseInt(form.number, 10);
    if (isNaN(chapterNumber) || chapterNumber < 1) {
      setErrors({ number: "Must be a positive integer." });
      return;
    }

    setSaving(true);
    setErrors({});

    const supabase = createClient();

    const chapterPayload = {
      book_id: bookId,
      number: chapterNumber,
      title: form.title,
      milestone_label: form.milestoneLabel || null,
      reflect_question: form.reflectQuestion.trim(),
      challenge_text: form.challengeText.trim(),
      mux_playback_id: form.muxPlaybackId || null,
      unlock_code: form.unlockCode.toUpperCase().trim() || null,
    };

    if (isEdit) {
      const { error: chErr } = await supabase
        .from("chapters")
        .update(chapterPayload)
        .eq("id", chapter.id);

      if (chErr) {
        setSaving(false);
        setErrors(chapterSaveError(chErr));
        return;
      }

      const badgePayload = {
        name: form.badgeName,
        icon: form.badgeIcon || null,
        description: form.badgeDescription || null,
        badge_image_url: form.badgeImageUrl || null,
      };

      if (badge) {
        const { error: bErr } = await supabase.from("badges").update(badgePayload).eq("id", badge.id);
        if (bErr) {
          setSaving(false);
          setErrors({ form: "Chapter saved but badge update failed." });
          return;
        }
      } else {
        const { error: bErr } = await supabase.from("badges").insert({ ...badgePayload, chapter_id: chapter.id });
        if (bErr) {
          setSaving(false);
          setErrors({ form: "Chapter saved but badge creation failed." });
          return;
        }
      }
    } else {
      const { data: newChapter, error: chErr } = await supabase
        .from("chapters")
        .insert(chapterPayload)
        .select("id")
        .single();

      if (chErr || !newChapter) {
        setSaving(false);
        setErrors(chErr ? chapterSaveError(chErr) : { form: "Chapter insert returned no data. Try again." });
        return;
      }

      const { error: bErr } = await supabase.from("badges").insert({
        chapter_id: newChapter.id,
        name: form.badgeName,
        icon: form.badgeIcon || null,
        description: form.badgeDescription || null,
        badge_image_url: form.badgeImageUrl || null,
      });

      if (bErr) {
        setSaving(false);
        setErrors({ form: "Chapter created but badge creation failed." });
        return;
      }
    }

    setSaving(false);
    router.push(`/admin/books/${bookId}/chapters`);
    router.refresh();
  }

  return (
    <div className="space-y-6 max-w-xl">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Chapter number" error={errors.number} required>
          <input
            type="number"
            min={1}
            value={form.number}
            onChange={(e) => set("number", e.target.value)}
            className={input(errors.number)}
            placeholder="1"
          />
        </Field>
        <Field label="Title" error={errors.title} required>
          <input
            type="text"
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            className={input(errors.title)}
            placeholder="I am Brand New"
          />
        </Field>
      </div>

      <Field label="Milestone label" error={errors.milestoneLabel}>
        <input
          type="text"
          value={form.milestoneLabel}
          onChange={(e) => set("milestoneLabel", e.target.value)}
          className={input()}
          placeholder="Shown on the chapter card (optional)"
        />
      </Field>

      <Field label="Reflection question" error={errors.reflectQuestion} required>
        <textarea
          value={form.reflectQuestion}
          onChange={(e) => set("reflectQuestion", e.target.value)}
          rows={3}
          className={input(errors.reflectQuestion)}
          placeholder="What's one thing you're carrying right now that you wish you could set down?"
        />
      </Field>

      <Field label="Challenge" error={errors.challengeText} required>
        <textarea
          value={form.challengeText}
          onChange={(e) => set("challengeText", e.target.value)}
          rows={3}
          className={input(errors.challengeText)}
          placeholder="This week, notice one moment when…"
        />
      </Field>

      <Field label="Video" error={errors.muxPlaybackId}>
        <MuxUploader
          value={form.muxPlaybackId}
          onChange={(id) => set("muxPlaybackId", id)}
        />
      </Field>

      <Field
        label="Unlock code"
        error={errors.unlockCode}
        hint="Readers enter this alongside their reflection to claim this chapter's badge. Leave blank to require no code."
      >
        <input
          type="text"
          value={form.unlockCode}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              unlockCode: e.target.value.toUpperCase().replace(/\s/g, ""),
            }))
          }
          className={`${input(errors.unlockCode)} uppercase tracking-widest`}
          placeholder="READY"
          spellCheck={false}
        />
      </Field>

      <div className="border-t border-pink-pale pt-6">
        <p className="text-xs uppercase tracking-widest text-gray-400 mb-4">Badge</p>

        <div className="space-y-4">
          <Field label="Badge name" error={errors.badgeName} required>
            <input
              type="text"
              value={form.badgeName}
              onChange={(e) => set("badgeName", e.target.value)}
              className={input(errors.badgeName)}
              placeholder="New Arrival"
            />
          </Field>

          <Field label="Icon (emoji or code)" error={errors.badgeIcon}>
            <input
              type="text"
              value={form.badgeIcon}
              onChange={(e) => set("badgeIcon", e.target.value)}
              className={input()}
              placeholder="🌱"
            />
          </Field>

          <Field label="Badge description" error={errors.badgeDescription}>
            <textarea
              value={form.badgeDescription}
              onChange={(e) => set("badgeDescription", e.target.value)}
              rows={2}
              className={input()}
              placeholder="Awarded for completing Chapter 1"
            />
          </Field>

          {/* Badge image upload */}
          <Field label="Badge image" error={errors.badgeImageUrl}>
            <p className="text-xs text-gray-300 mb-2">Recommended: 500×500px square PNG with transparent background</p>
            <input
              ref={badgeImageInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={handleBadgeImageUpload}
            />
            <div className="flex items-start gap-4">
              {form.badgeImageUrl && (
                <img
                  src={form.badgeImageUrl}
                  alt="Badge preview"
                  className="w-16 h-16 object-contain flex-shrink-0 rounded-lg border border-gray-100 bg-gray-50"
                />
              )}
              <div className="flex flex-col gap-2 flex-1">
                <button
                  type="button"
                  onClick={() => badgeImageInputRef.current?.click()}
                  disabled={uploadingBadgeImage}
                  className="border border-dashed border-gray-300 hover:border-pink-dusty rounded-lg px-4 py-2.5 text-sm text-gray-400 hover:text-ink transition-colors text-left disabled:opacity-50"
                >
                  {uploadingBadgeImage
                    ? "Uploading…"
                    : form.badgeImageUrl
                    ? "Replace image"
                    : "+ Upload badge image"}
                </button>
                {form.badgeImageUrl && (
                  <button
                    type="button"
                    onClick={() => set("badgeImageUrl", "")}
                    className="text-xs text-gray-300 hover:text-pink-deep transition-colors text-left"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          </Field>
        </div>
      </div>

      {errors.form && <p className="text-sm text-pink-deep">{errors.form}</p>}

      <div className="flex gap-3 pt-2">
        <button
          onClick={handleSave}
          disabled={saving || uploadingBadgeImage}
          className="bg-plum text-white px-6 py-2.5 rounded-xl2 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {saving ? "Saving…" : isEdit ? "Save changes" : "Create chapter"}
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

function input(error?: string) {
  return `w-full border ${
    error ? "border-pink-deep" : "border-gray-200"
  } rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-pink-dusty transition-colors bg-white`;
}

function Field({
  label,
  error,
  hint,
  required,
  children,
}: {
  label: string;
  error?: string;
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
      {error && <p className="text-xs text-pink-deep mt-1">{error}</p>}
      {!error && hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}
