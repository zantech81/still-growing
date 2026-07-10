"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type ChapterData = {
  id: string;
  number: number;
  title: string;
  milestone_label: string | null;
  reflect_question: string | null;
  challenge_text: string | null;
  mux_playback_id: string | null;
};

type BadgeData = {
  id: string;
  name: string;
  icon: string | null;
  description: string | null;
};

type Props = {
  bookId: string;
  chapter?: ChapterData;
  badge?: BadgeData | null;
};

export default function ChapterForm({ bookId, chapter, badge }: Props) {
  const router = useRouter();
  const isEdit = !!chapter;

  const [form, setForm] = useState({
    number: chapter?.number?.toString() ?? "",
    title: chapter?.title ?? "",
    milestoneLabel: chapter?.milestone_label ?? "",
    reflectQuestion: chapter?.reflect_question ?? "",
    challengeText: chapter?.challenge_text ?? "",
    muxPlaybackId: chapter?.mux_playback_id ?? "",
    badgeName: badge?.name ?? "",
    badgeIcon: badge?.icon ?? "",
    badgeDescription: badge?.description ?? "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  function set(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: "" }));
  }

  async function handleSave() {
    if (!form.number || !form.title || !form.badgeName) {
      setErrors({
        number: form.number ? "" : "Chapter number is required.",
        title: form.title ? "" : "Title is required.",
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
      reflect_question: form.reflectQuestion || null,
      challenge_text: form.challengeText || null,
      mux_playback_id: form.muxPlaybackId || null,
    };

    if (isEdit) {
      const { error: chErr } = await supabase
        .from("chapters")
        .update(chapterPayload)
        .eq("id", chapter.id);

      if (chErr) {
        setSaving(false);
        setErrors({ form: chErr.code === "23505" ? "Chapter number already exists in this book." : "Something went wrong." });
        return;
      }

      const badgePayload = {
        name: form.badgeName,
        icon: form.badgeIcon || null,
        description: form.badgeDescription || null,
      };

      if (badge) {
        const { error: bErr } = await supabase
          .from("badges")
          .update(badgePayload)
          .eq("id", badge.id);
        if (bErr) {
          setSaving(false);
          setErrors({ form: "Chapter saved but badge update failed." });
          return;
        }
      } else {
        const { error: bErr } = await supabase
          .from("badges")
          .insert({ ...badgePayload, chapter_id: chapter.id });
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
        setErrors({ form: chErr?.code === "23505" ? "Chapter number already exists in this book." : "Something went wrong." });
        return;
      }

      const { error: bErr } = await supabase.from("badges").insert({
        chapter_id: newChapter.id,
        name: form.badgeName,
        icon: form.badgeIcon || null,
        description: form.badgeDescription || null,
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

      <Field label="Reflection question" error={errors.reflectQuestion}>
        <textarea
          value={form.reflectQuestion}
          onChange={(e) => set("reflectQuestion", e.target.value)}
          rows={3}
          className={input()}
          placeholder="What's one thing you're carrying right now that you wish you could set down?"
        />
      </Field>

      <Field label="Challenge" error={errors.challengeText}>
        <textarea
          value={form.challengeText}
          onChange={(e) => set("challengeText", e.target.value)}
          rows={3}
          className={input()}
          placeholder="This week, notice one moment when…"
        />
      </Field>

      <Field label="Mux playback ID" error={errors.muxPlaybackId}>
        <input
          type="text"
          value={form.muxPlaybackId}
          onChange={(e) => set("muxPlaybackId", e.target.value)}
          className={input()}
          placeholder="Leave blank if no video yet"
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
        </div>
      </div>

      {errors.form && <p className="text-sm text-pink-deep">{errors.form}</p>}

      <div className="flex gap-3 pt-2">
        <button
          onClick={handleSave}
          disabled={saving}
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
  required,
  children,
}: {
  label: string;
  error?: string;
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
    </div>
  );
}
