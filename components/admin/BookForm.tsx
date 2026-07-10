"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { RESERVED_SLUGS } from "@/lib/reservedSlugs";

type Collection = { id: string; name: string };

type BookData = {
  id: string;
  collection_id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  slug: string;
  cover_image_url: string | null;
  redemption_code: string | null;
  status: "draft" | "coming_soon" | "published";
};

type Props = {
  collections: Collection[];
  book?: BookData;
};

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  coming_soon: "Coming soon",
  published: "Published",
};

export default function BookForm({ collections, book }: Props) {
  const router = useRouter();
  const isEdit = !!book;

  const [form, setForm] = useState({
    collectionId: book?.collection_id ?? collections[0]?.id ?? "",
    title: book?.title ?? "",
    subtitle: book?.subtitle ?? "",
    description: book?.description ?? "",
    slug: book?.slug ?? "",
    coverImageUrl: book?.cover_image_url ?? "",
    redemptionCode: book?.redemption_code ?? "",
    status: book?.status ?? ("draft" as "draft" | "coming_soon" | "published"),
  });
  const [slugEdited, setSlugEdited] = useState(isEdit);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);

  function set(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: "" }));
  }

  function handleTitleChange(title: string) {
    setForm((f) => ({
      ...f,
      title,
      slug: slugEdited ? f.slug : slugify(title),
    }));
    setErrors((e) => ({ ...e, title: "", slug: "" }));
  }

  function handleSlugChange(slug: string) {
    setSlugEdited(true);
    const cleaned = slug.toLowerCase().replace(/[^a-z0-9-]/g, "");
    setForm((f) => ({ ...f, slug: cleaned }));
    setErrors((e) => ({ ...e, slug: "" }));
  }

  function validateSlug(slug: string): string {
    if (!slug) return "Slug is required.";
    if (RESERVED_SLUGS.has(slug))
      return `"${slug}" is reserved for app navigation and can't be used as a book slug.`;
    if (!/^[a-z][a-z0-9-]*$/.test(slug))
      return "Slug must start with a letter and contain only lowercase letters, numbers, and hyphens.";
    return "";
  }

  async function handleSave() {
    const slugError = validateSlug(form.slug);
    if (!form.title || !form.slug || slugError || !form.collectionId) {
      setErrors({
        title: form.title ? "" : "Title is required.",
        slug: slugError || (form.slug ? "" : "Slug is required."),
        collectionId: form.collectionId ? "" : "Collection is required.",
      });
      return;
    }

    // Detect publish transition before the save so we can notify after.
    const isPublishing = isEdit && book.status !== "published" && form.status === "published";

    setSaving(true);
    setErrors({});

    const supabase = createClient();
    const payload = {
      collection_id: form.collectionId,
      title: form.title,
      subtitle: form.subtitle || null,
      description: form.description || null,
      slug: form.slug,
      cover_image_url: form.coverImageUrl || null,
      redemption_code: form.redemptionCode.toUpperCase().trim() || null,
      status: form.status,
    };

    const { error } = isEdit
      ? await supabase.from("books").update(payload).eq("id", book.id)
      : await supabase.from("books").insert(payload);

    if (error) {
      setSaving(false);
      if (error.code === "23505") {
        if (error.message.includes("slug")) {
          setErrors({ slug: "A book with this slug already exists." });
        } else if (error.message.includes("redemption_code")) {
          setErrors({ redemptionCode: "This access code is already used by another book." });
        } else {
          setErrors({ form: "A duplicate value was detected. Check slug and access code." });
        }
      } else {
        setErrors({ form: "Something went wrong. Please try again." });
      }
      return;
    }

    // Send member notifications when a book is first published.
    if (isPublishing) {
      setPublishing(true);
      await fetch("/api/admin/notify-book-launch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookId: book.id }),
      }).catch(console.error);
      setPublishing(false);
    }

    setSaving(false);
    router.push("/admin/books");
    router.refresh();
  }

  return (
    <div className="space-y-6 max-w-xl">
      {/* Collection */}
      <Field label="Collection" error={errors.collectionId} required>
        <select
          value={form.collectionId}
          onChange={(e) => set("collectionId", e.target.value)}
          className={input(errors.collectionId)}
        >
          {collections.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </Field>

      {/* Title */}
      <Field label="Title" error={errors.title} required>
        <input
          type="text"
          value={form.title}
          onChange={(e) => handleTitleChange(e.target.value)}
          className={input(errors.title)}
          placeholder="Life Lessons from a Baby"
        />
      </Field>

      {/* Slug */}
      <Field
        label="Slug"
        error={errors.slug}
        hint={`URL: stillgrowing.co/${form.slug || "…"}`}
        required
      >
        <input
          type="text"
          value={form.slug}
          onChange={(e) => handleSlugChange(e.target.value)}
          onBlur={() => {
            const err = validateSlug(form.slug);
            if (err) setErrors((e) => ({ ...e, slug: err }));
          }}
          className={input(errors.slug)}
          placeholder="baby"
        />
      </Field>

      {/* Subtitle */}
      <Field label="Subtitle" error={errors.subtitle}>
        <input
          type="text"
          value={form.subtitle}
          onChange={(e) => set("subtitle", e.target.value)}
          className={input()}
          placeholder="Optional"
        />
      </Field>

      {/* Description */}
      <Field label="Description" error={errors.description}>
        <textarea
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          rows={3}
          className={input()}
          placeholder="Shown on the book card (optional)"
        />
      </Field>

      {/* Redemption code */}
      <Field
        label="Access code"
        error={errors.redemptionCode}
        hint="Readers enter this to unlock the book. Leave blank to keep locked but unenterable."
      >
        <input
          type="text"
          value={form.redemptionCode}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              redemptionCode: e.target.value.toUpperCase().replace(/\s/g, ""),
            }))
          }
          className={`${input(errors.redemptionCode)} uppercase tracking-widest`}
          placeholder="GROWBABY"
          spellCheck={false}
        />
      </Field>

      {/* Cover image URL */}
      <Field label="Cover image URL" error={errors.coverImageUrl}>
        <input
          type="url"
          value={form.coverImageUrl}
          onChange={(e) => set("coverImageUrl", e.target.value)}
          className={input()}
          placeholder="https://…"
        />
      </Field>

      {/* Status */}
      <Field label="Status" error={errors.status} required>
        <select
          value={form.status}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              status: e.target.value as typeof form.status,
            }))
          }
          className={input()}
        >
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        {form.status === "published" && !isEdit && (
          <p className="text-xs text-pink-deep mt-1">
            Publishing immediately — readers will see this book in their Library.
          </p>
        )}
      </Field>

      {errors.form && <p className="text-sm text-pink-deep">{errors.form}</p>}

      <div className="flex gap-3 pt-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-plum text-white px-6 py-2.5 rounded-xl2 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {publishing ? "Notifying members…" : saving ? "Saving…" : isEdit ? "Save changes" : "Create book"}
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
