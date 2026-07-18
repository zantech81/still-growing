"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { RESERVED_SLUGS } from "@/lib/reservedSlugs";
import { PLACEHOLDER_PRESETS, DEFAULT_PLACEHOLDER_TEXT } from "@/lib/comingSoonPlaceholders";

type Collection = { id: string; name: string };

type GamificationConfig = {
  mechanic?: string;
  badge_trigger?: string;
  reward_type?: string;
  chapter_unlock?: string;
  reflection?: { enabled?: boolean; required?: boolean; max_length?: number };
};

type BookData = {
  id: string;
  collection_id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  slug: string;
  cover_image_url: string | null;
  banner_image_url: string | null;
  share_banner_image_url: string | null;
  sales_page_url: string | null;
  redemption_code: string | null;
  status: "draft" | "coming_soon" | "published";
  reveal_details: boolean;
  placeholder_text: string | null;
  gamification_config: GamificationConfig | null;
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
    bannerImageUrl: book?.banner_image_url ?? "",
    shareBannerImageUrl: book?.share_banner_image_url ?? "",
    salesPageUrl: book?.sales_page_url ?? "",
    redemptionCode: book?.redemption_code ?? "",
    status: book?.status ?? ("draft" as "draft" | "coming_soon" | "published"),
    revealDetails: book?.reveal_details ?? true,
    placeholderText: book?.placeholder_text ?? DEFAULT_PLACEHOLDER_TEXT,
    maxReflectionLength: String(book?.gamification_config?.reflection?.max_length ?? 350),
  });
  const [placeholderMode, setPlaceholderMode] = useState<"preset" | "custom">(
    (PLACEHOLDER_PRESETS as readonly string[]).includes(book?.placeholder_text ?? DEFAULT_PLACEHOLDER_TEXT)
      ? "preset"
      : "custom"
  );
  const [slugEdited, setSlugEdited] = useState(isEdit);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  // Tracks which image field is currently uploading (null = none)
  const [uploadingField, setUploadingField] = useState<
    "coverImageUrl" | "bannerImageUrl" | "shareBannerImageUrl" | null
  >(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const shareBannerInputRef = useRef<HTMLInputElement>(null);

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

  async function handleImageUpload(
    field: "coverImageUrl" | "bannerImageUrl" | "shareBannerImageUrl",
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `covers/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    setUploadingField(field);
    setErrors((err) => ({ ...err, [field]: "" }));

    const supabase = createClient();
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("book-covers")
      .upload(path, file, { upsert: false });

    if (uploadError || !uploadData) {
      console.error("[BookForm] Image upload error:", uploadError);
      setUploadingField(null);
      setErrors((err) => ({
        ...err,
        [field]: uploadError?.message
          ? `Upload failed: ${uploadError.message}`
          : "Upload failed. Try again.",
      }));
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from("book-covers")
      .getPublicUrl(uploadData.path);

    set(field, publicUrl);
    setUploadingField(null);
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
    const existingConfig: GamificationConfig = book?.gamification_config ?? {};
    const gamificationConfig: GamificationConfig = {
      mechanic: "badges",
      badge_trigger: "claim_after_read",
      reward_type: "video",
      chapter_unlock: "sequential",
      ...existingConfig,
      reflection: {
        enabled: true,
        required: false,
        ...(existingConfig.reflection ?? {}),
        max_length: parseInt(form.maxReflectionLength, 10) || 350,
      },
    };

    const payload = {
      collection_id: form.collectionId,
      title: form.title,
      subtitle: form.subtitle || null,
      description: form.description || null,
      slug: form.slug,
      cover_image_url: form.coverImageUrl || null,
      banner_image_url: form.bannerImageUrl || null,
      share_banner_image_url: form.shareBannerImageUrl || null,
      sales_page_url: form.salesPageUrl.trim() || null,
      redemption_code: form.redemptionCode.toUpperCase().trim() || null,
      status: form.status,
      reveal_details: form.revealDetails,
      placeholder_text: form.placeholderText.trim() || null,
      gamification_config: gamificationConfig,
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
        console.error("[BookForm] Save error:", error);
        setErrors({
          form: error.message
            ? `Save failed (${error.code ?? "unknown"}): ${error.message}${error.hint ? `. ${error.hint}` : ""}`
            : "Save failed. Check the browser console for details.",
        });
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

      {/* Sales page URL */}
      <Field
        label="Sales page URL"
        error={errors.salesPageUrl}
        hint="The real Systeme.io sales page link (e.g. baby.stillgrowing.co/XXXX). Shown as the CTA on shared reflection/badge/progress links; left blank hides that button rather than guessing a URL."
      >
        <input
          type="text"
          value={form.salesPageUrl}
          onChange={(e) => set("salesPageUrl", e.target.value)}
          className={input(errors.salesPageUrl)}
          placeholder="https://baby.stillgrowing.co/XXXX"
        />
      </Field>

      {/* Max reflection length */}
      <Field
        label="Max reflection length"
        hint="Characters allowed per reflection. Shown to readers as a live counter."
      >
        <input
          type="number"
          min={50}
          max={2000}
          value={form.maxReflectionLength}
          onChange={(e) => set("maxReflectionLength", e.target.value)}
          className={input()}
        />
      </Field>

      {/* Cover image: thumbnail (library cards, ~50×66px display) */}
      <Field label="Cover image (thumbnail)" error={errors.coverImageUrl}>
        <input
          ref={coverInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(e) => handleImageUpload("coverImageUrl", e)}
        />
        <div className="flex items-start gap-4">
          {form.coverImageUrl && (
            <img
              src={form.coverImageUrl}
              alt="Thumbnail preview"
              className="w-[50px] h-[66px] object-cover rounded-lg flex-shrink-0 border border-gray-100"
            />
          )}
          <div className="flex flex-col gap-2 flex-1">
            <button
              type="button"
              onClick={() => coverInputRef.current?.click()}
              disabled={uploadingField !== null}
              className="border border-dashed border-gray-300 hover:border-pink-dusty rounded-lg px-4 py-2.5 text-sm text-gray-400 hover:text-ink transition-colors text-left disabled:opacity-50"
            >
              {uploadingField === "coverImageUrl"
                ? "Uploading…"
                : form.coverImageUrl
                ? "Replace thumbnail"
                : "+ Upload thumbnail"}
            </button>
            {form.coverImageUrl && (
              <button
                type="button"
                onClick={() => set("coverImageUrl", "")}
                className="text-xs text-gray-300 hover:text-pink-deep transition-colors text-left"
              >
                Remove
              </button>
            )}
          </div>
        </div>
      </Field>

      {/* Banner image: full portrait cover (Journey page, ~625×1000 / 5:8) */}
      <Field label="Cover image (full, Journey page)" error={errors.bannerImageUrl}>
        <p className="text-xs text-gray-300 mb-2">Recommended: ~625×1000px portrait (5:8 ratio)</p>
        <input
          ref={bannerInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(e) => handleImageUpload("bannerImageUrl", e)}
        />
        <div className="flex items-start gap-4">
          {form.bannerImageUrl && (
            <img
              src={form.bannerImageUrl}
              alt="Banner preview"
              className="w-[50px] h-[66px] object-cover object-top rounded-lg flex-shrink-0 border border-gray-100"
            />
          )}
          <div className="flex flex-col gap-2 flex-1">
            <button
              type="button"
              onClick={() => bannerInputRef.current?.click()}
              disabled={uploadingField !== null}
              className="border border-dashed border-gray-300 hover:border-pink-dusty rounded-lg px-4 py-2.5 text-sm text-gray-400 hover:text-ink transition-colors text-left disabled:opacity-50"
            >
              {uploadingField === "bannerImageUrl"
                ? "Uploading…"
                : form.bannerImageUrl
                ? "Replace banner"
                : "+ Upload banner image"}
            </button>
            {form.bannerImageUrl && (
              <button
                type="button"
                onClick={() => set("bannerImageUrl", "")}
                className="text-xs text-gray-300 hover:text-pink-deep transition-colors text-left"
              >
                Remove
              </button>
            )}
          </div>
        </div>
      </Field>

      {/* Share page banner: landscape scene image, used ONLY on shared
          links (/r/[shareId]). Deliberately its own field, separate from
          both the Library thumbnail and the Journey page's portrait
          cover above, so uploading this can never affect either of those. */}
      <Field label="Share page banner (landscape, used only on shared links)" error={errors.shareBannerImageUrl}>
        <p className="text-xs text-gray-300 mb-2">
          Exact size: 1376×786px landscape. Shown only on /r/[shareId] pages when a badge,
          progress, or reflection is shared, not on the Library or Journey page.
        </p>
        <input
          ref={shareBannerInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(e) => handleImageUpload("shareBannerImageUrl", e)}
        />
        <div className="flex items-start gap-4">
          {form.shareBannerImageUrl && (
            <img
              src={form.shareBannerImageUrl}
              alt="Share page banner preview"
              className="w-24 aspect-[1376/786] object-cover rounded-lg flex-shrink-0 border border-gray-100"
            />
          )}
          <div className="flex flex-col gap-2 flex-1">
            <button
              type="button"
              onClick={() => shareBannerInputRef.current?.click()}
              disabled={uploadingField !== null}
              className="border border-dashed border-gray-300 hover:border-pink-dusty rounded-lg px-4 py-2.5 text-sm text-gray-400 hover:text-ink transition-colors text-left disabled:opacity-50"
            >
              {uploadingField === "shareBannerImageUrl"
                ? "Uploading…"
                : form.shareBannerImageUrl
                ? "Replace share page banner"
                : "+ Upload share page banner"}
            </button>
            {form.shareBannerImageUrl && (
              <button
                type="button"
                onClick={() => set("shareBannerImageUrl", "")}
                className="text-xs text-gray-300 hover:text-pink-deep transition-colors text-left"
              >
                Remove
              </button>
            )}
          </div>
        </div>
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
            Publishing immediately. Readers will see this book in their Library.
          </p>
        )}
      </Field>

      {/* Reveal details: only meaningful while coming_soon */}
      {form.status === "coming_soon" && (
        <Field label="Coming soon teaser">
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={form.revealDetails}
              onChange={(e) => setForm((f) => ({ ...f, revealDetails: e.target.checked }))}
            />
            Reveal title and details to readers
          </label>
          <p className="text-xs text-gray-400 mt-1">
            {form.revealDetails
              ? "Readers will see this book's real title, subtitle, and description in their Library."
              : "Readers will see the placeholder text below instead of this book's title/details."}
          </p>

          {!form.revealDetails && (
            <div className="mt-3">
              <select
                value={placeholderMode === "custom" ? "custom" : form.placeholderText}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === "custom") {
                    setPlaceholderMode("custom");
                  } else {
                    setPlaceholderMode("preset");
                    setForm((f) => ({ ...f, placeholderText: value }));
                  }
                }}
                className={input()}
              >
                {PLACEHOLDER_PRESETS.map((preset) => (
                  <option key={preset} value={preset}>
                    {preset}
                  </option>
                ))}
                <option value="custom">Custom…</option>
              </select>
              {placeholderMode === "custom" && (
                <input
                  type="text"
                  value={form.placeholderText}
                  onChange={(e) => setForm((f) => ({ ...f, placeholderText: e.target.value }))}
                  className={`${input()} mt-2`}
                  placeholder="Write your own teaser copy"
                />
              )}
            </div>
          )}
        </Field>
      )}

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
