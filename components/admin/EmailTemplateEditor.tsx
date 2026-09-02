"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  type EmailTemplateType,
  type EmailTemplateRow,
  EMAIL_TEMPLATE_LABELS,
  EMAIL_TEMPLATE_IS_ADMIN_ONLY,
  DEFAULT_EMAIL_TEMPLATES,
  EMAIL_TEMPLATE_SAMPLE_VARS,
  EMAIL_TEMPLATE_SAMPLE_HREF,
  resolveEmailTemplate,
  renderEmailHtml,
  renderEmailSubject,
} from "@/lib/emailTemplates";

type Props = {
  type: EmailTemplateType;
  initialRow: Pick<EmailTemplateRow, "type" | "subject" | "heading" | "body" | "button_label"> | null;
};

// The live preview below calls the exact same renderEmailHtml/
// renderEmailSubject that a real send uses (lib/sendgrid.ts's per-type
// wrapper functions call the same lib/emailTemplates.ts functions) --
// never a separate preview-only approximation. Fed with
// EMAIL_TEMPLATE_SAMPLE_VARS instead of real values, same idea as
// resolveEmailTemplate's field-by-field fallback: an emptied field
// previews using this type's default, not a blank.
export default function EmailTemplateEditor({ type, initialRow }: Props) {
  const def = DEFAULT_EMAIL_TEMPLATES[type];
  const [subject, setSubject] = useState(initialRow?.subject ?? "");
  const [heading, setHeading] = useState(initialRow?.heading ?? "");
  const [body, setBody] = useState(initialRow?.body ?? "");
  const [buttonLabel, setButtonLabel] = useState(initialRow?.button_label ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const dirty =
    subject !== (initialRow?.subject ?? "") ||
    heading !== (initialRow?.heading ?? "") ||
    body !== (initialRow?.body ?? "") ||
    buttonLabel !== (initialRow?.button_label ?? "");

  const preview = useMemo(() => {
    const fields = resolveEmailTemplate(type, {
      type,
      subject,
      heading,
      body,
      button_label: buttonLabel,
    });
    const vars = EMAIL_TEMPLATE_SAMPLE_VARS[type];
    const href = EMAIL_TEMPLATE_SAMPLE_HREF[type];
    return {
      subject: renderEmailSubject(fields, vars),
      html: renderEmailHtml(fields, vars, href),
    };
  }, [type, subject, heading, body, buttonLabel]);

  async function save() {
    setSaving(true);
    setError("");
    setSaved(false);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error: updateError } = await supabase
      .from("email_templates")
      .update({
        subject: subject.trim() || null,
        heading: heading.trim() || null,
        body: body.trim() || null,
        button_label: buttonLabel.trim() || null,
        updated_at: new Date().toISOString(),
        updated_by: user?.id ?? null,
      })
      .eq("type", type);

    setSaving(false);
    if (updateError) {
      setError("Save failed. Try again.");
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div>
      <Link href="/admin/email-templates" className="text-sm text-pink-deep hover:underline mb-4 inline-block">
        ← Email templates
      </Link>
      <h1 className="text-3xl font-display text-plum mb-1">{EMAIL_TEMPLATE_LABELS[type]}</h1>
      {EMAIL_TEMPLATE_IS_ADMIN_ONLY[type] && (
        <p className="text-sm text-gray-400 mb-6">
          This is an internal alert sent only to admin@stillgrowing.co -- no reader ever receives it.
        </p>
      )}
      {!EMAIL_TEMPLATE_IS_ADMIN_ONLY[type] && <div className="mb-6" />}

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-5">
          <Field label="Subject" placeholder={def.subject} value={subject} onChange={setSubject} />
          <Field label="Heading" placeholder={def.heading} value={heading} onChange={setHeading} />
          <Field
            label="Body"
            placeholder={def.body}
            value={body}
            onChange={setBody}
            textarea
            hint="Separate paragraphs with a blank line."
          />
          <Field label="Button label" placeholder={def.buttonLabel} value={buttonLabel} onChange={setButtonLabel} />

          {error && <p className="text-sm text-pink-deep">{error}</p>}

          <div className="flex items-center gap-3">
            <button
              onClick={save}
              disabled={saving || !dirty}
              className="bg-plum text-white px-5 py-2 rounded-xl2 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {saving ? "Saving…" : saved ? "Saved ✓" : "Save"}
            </button>
            {dirty && !saving && !saved && <span className="text-xs text-gray-400">Unsaved changes</span>}
          </div>
        </div>

        <div>
          <p className="text-xs uppercase tracking-widest text-gray-400 mb-2">
            Live preview <span className="normal-case tracking-normal text-gray-300">(sample data)</span>
          </p>
          <p className="text-sm text-ink mb-2">
            <span className="text-gray-400">Subject:</span> {preview.subject}
          </p>
          <iframe
            title="Email preview"
            srcDoc={preview.html}
            className="w-full border border-pink-pale rounded-xl2 bg-white"
            style={{ height: "600px" }}
          />
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  placeholder,
  value,
  onChange,
  textarea,
  hint,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  textarea?: boolean;
  hint?: string;
}) {
  const className =
    "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-pink-dusty transition-colors bg-white";
  return (
    <div>
      <label className="text-xs uppercase tracking-widest text-gray-400 block mb-1.5">{label}</label>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={6}
          className={className}
        />
      ) : (
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={className} />
      )}
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}
