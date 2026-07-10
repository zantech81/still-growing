"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type CollectionData = {
  id: string;
  name: string;
  description: string | null;
  sort_order: number;
  status: "draft" | "coming_soon" | "published";
};

type Props = {
  collection?: CollectionData;
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  coming_soon: "Coming soon",
  published: "Published",
};

export default function CollectionForm({ collection }: Props) {
  const router = useRouter();
  const isEdit = !!collection;

  const [form, setForm] = useState({
    name: collection?.name ?? "",
    description: collection?.description ?? "",
    sortOrder: collection?.sort_order?.toString() ?? "0",
    status: collection?.status ?? ("draft" as "draft" | "coming_soon" | "published"),
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  function set(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: "" }));
  }

  async function handleSave() {
    if (!form.name.trim()) {
      setErrors({ name: "Name is required." });
      return;
    }

    const sortOrder = parseInt(form.sortOrder, 10);
    if (isNaN(sortOrder)) {
      setErrors({ sortOrder: "Must be an integer." });
      return;
    }

    setSaving(true);
    setErrors({});

    const supabase = createClient();
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      sort_order: sortOrder,
      status: form.status,
    };

    const { error } = isEdit
      ? await supabase.from("collections").update(payload).eq("id", collection.id)
      : await supabase.from("collections").insert(payload);

    setSaving(false);

    if (error) {
      setErrors({ form: "Something went wrong. Please try again." });
      return;
    }

    router.push("/admin/collections");
    router.refresh();
  }

  return (
    <div className="space-y-6 max-w-xl">
      <Field label="Name" error={errors.name} required>
        <input
          type="text"
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          className={input(errors.name)}
          placeholder="Baby Wisdom"
        />
      </Field>

      <Field label="Description" error={errors.description}>
        <textarea
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          rows={3}
          className={input()}
          placeholder="Shown on the Library (optional)"
        />
      </Field>

      <Field
        label="Sort order"
        error={errors.sortOrder}
        hint="Lower numbers appear first. Collections with the same sort order are listed alphabetically."
      >
        <input
          type="number"
          value={form.sortOrder}
          onChange={(e) => set("sortOrder", e.target.value)}
          className={`${input(errors.sortOrder)} w-24`}
        />
      </Field>

      <Field label="Status" error={errors.status} required>
        <select
          value={form.status}
          onChange={(e) =>
            setForm((f) => ({ ...f, status: e.target.value as typeof form.status }))
          }
          className={input()}
        >
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </Field>

      {errors.form && <p className="text-sm text-pink-deep">{errors.form}</p>}

      <div className="flex gap-3 pt-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-plum text-white px-6 py-2.5 rounded-xl2 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {saving ? "Saving…" : isEdit ? "Save changes" : "Create collection"}
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
