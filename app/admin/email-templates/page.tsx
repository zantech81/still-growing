import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { EMAIL_TEMPLATE_TYPES, EMAIL_TEMPLATE_LABELS, EMAIL_TEMPLATE_IS_ADMIN_ONLY } from "@/lib/emailTemplates";

// "Customized" means at least one of the four editable fields is set --
// resolveEmailTemplate() falls back field-by-field, so a row with only
// e.g. a custom subject and everything else null is still meaningfully
// customized, not "using defaults."
function isCustomized(row: { subject: string | null; heading: string | null; body: string | null; button_label: string | null } | undefined) {
  if (!row) return false;
  return !!(row.subject?.trim() || row.heading?.trim() || row.body?.trim() || row.button_label?.trim());
}

export default async function EmailTemplatesListPage() {
  const supabase = createClient();
  const { data: rows } = await supabase
    .from("email_templates")
    .select("type, subject, heading, body, button_label");

  const rowsByType = new Map((rows ?? []).map((r) => [r.type, r]));

  return (
    <div>
      <h1 className="text-3xl font-display text-plum mb-2">Email templates</h1>
      <p className="text-sm text-gray-400 mb-8">
        Customize the subject, heading, body copy, and button label for each transactional email.
        Layout and styling stay fixed -- only the words change.
      </p>

      <div className="space-y-3">
        {EMAIL_TEMPLATE_TYPES.map((type) => {
          const customized = isCustomized(rowsByType.get(type));
          return (
            <Link
              key={type}
              href={`/admin/email-templates/${type}`}
              className="flex items-center justify-between gap-4 bg-white border border-pink-pale hover:border-pink-dusty rounded-xl2 px-5 py-4 transition-colors"
            >
              <div>
                <p className="font-medium text-plum">
                  {EMAIL_TEMPLATE_LABELS[type]}
                  {EMAIL_TEMPLATE_IS_ADMIN_ONLY[type] && (
                    <span className="ml-2 text-xs text-gray-300 font-normal">(admin-only alert, not sent to readers)</span>
                  )}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">{customized ? "Customized" : "Using default copy"}</p>
              </div>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                  customized ? "bg-green-soft text-plum" : "bg-gray-100 text-gray-500"
                }`}
              >
                {customized ? "Customized" : "Default"}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
