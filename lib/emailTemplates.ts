// Pure/isomorphic on purpose -- no process.env secrets, no fetch, no
// Supabase client. Safe to import from both server code (lib/sendgrid.ts,
// lib/notifications.ts) and a "use client" admin preview component, so
// the exact same render path powers a real send and its own live
// preview -- never two slightly different implementations that could
// drift apart.

export const EMAIL_TEMPLATE_TYPES = [
  "reaction",
  "root_for",
  "new_book",
  "birthday",
  "unlock_alert",
  "grove_post",
] as const;

export type EmailTemplateType = (typeof EMAIL_TEMPLATE_TYPES)[number];

export const EMAIL_TEMPLATE_LABELS: Record<EmailTemplateType, string> = {
  reaction: "Reaction",
  root_for: "Root for",
  new_book: "New book",
  birthday: "Birthday",
  unlock_alert: "Unlock cluster alert",
  grove_post: "New Grove post",
};

// unlock_alert always goes to admin@stillgrowing.co (app/api/cron/unlock-alert),
// never a reader -- included in the editable set for consistency (an
// admin can still restyle its copy), but flagged here so the admin UI
// can say so rather than implying a reader ever sees it.
export const EMAIL_TEMPLATE_IS_ADMIN_ONLY: Record<EmailTemplateType, boolean> = {
  reaction: false,
  root_for: false,
  new_book: false,
  birthday: false,
  unlock_alert: true,
  grove_post: false,
};

export type EmailTemplateFields = {
  subject: string;
  heading: string;
  body: string;
  buttonLabel: string;
};

export type EmailTemplateRow = {
  type: EmailTemplateType;
  subject: string | null;
  heading: string | null;
  body: string | null;
  button_label: string | null;
};

// Extracted verbatim from what lib/sendgrid.ts's 12 template functions
// rendered before this feature existed -- these are the fallback
// whenever a DB field is null/empty, field by field (see
// resolveEmailTemplate below), and also what a never-customized admin
// editor shows as its placeholder text.
export const DEFAULT_EMAIL_TEMPLATES: Record<EmailTemplateType, EmailTemplateFields> = {
  reaction: {
    subject: "Someone in the Circle felt what you wrote",
    heading: "Someone felt what you wrote.",
    body: '{{reactorName}} felt what you wrote in Chapter {{chapterNumber}} and reacted with "I felt this."\n\nYour words are landing. Keep going.',
    buttonLabel: "Visit the Circle →",
  },
  root_for: {
    subject: "Someone started rooting for you",
    heading: "Someone started rooting for you.",
    body: "{{rooterName}} is standing behind your growth.\n\nYou're not doing this alone.",
    buttonLabel: "See your Growing page →",
  },
  new_book: {
    subject: "New in your Library: {{bookTitle}}",
    heading: "Something new just arrived.",
    body: "A new book has been added to your Still Growing library: {{bookTitle}}.\n\nHead over whenever you're ready.",
    buttonLabel: "Go to your Library →",
  },
  birthday: {
    subject: "Happy birthday, {{nickname}}!",
    heading: "Happy birthday, {{nickname}}!",
    body: "Today is a good day to remember. You were born ready. And still are.\n\nKeep growing. Keep going.",
    buttonLabel: "Continue your journey →",
  },
  unlock_alert: {
    subject: 'Unusual unlock activity: "{{bookTitle}}"',
    heading: "Unusual unlock activity",
    body: "{{bookTitle}} just saw {{unverifiedCount}} unverified unlocks in the trailing 24 hours -- more than usual.\n\nThis isn't necessarily piracy -- Amazon buyers, gift recipients, and checkout/sign-in email mismatches are always unverified too -- just worth a look.",
    buttonLabel: "Review this book's unlocks →",
  },
  grove_post: {
    subject: "New in the Grove: {{title}}",
    heading: "New in the Grove",
    body: "{{title}}\n\n{{excerpt}}",
    buttonLabel: "Read it in the Grove →",
  },
};

// Sample values for the admin editor's live preview -- fake but
// plausible, so a never-customized template previews as real prose
// rather than literal "{{reactorName}}" tokens.
export const EMAIL_TEMPLATE_SAMPLE_VARS: Record<EmailTemplateType, Record<string, string>> = {
  reaction: { reactorName: "Jamie", chapterNumber: "4" },
  root_for: { rooterName: "Jamie" },
  new_book: { bookTitle: "A Second Book" },
  birthday: { nickname: "Jamie" },
  unlock_alert: { bookTitle: "Life Lessons from a Baby", unverifiedCount: "12" },
  grove_post: {
    title: "A quick update",
    excerpt: "A short preview of what this post says, trimmed down to a sentence or two.",
  },
};

// Sample destination link for the preview button -- real sends always
// pass a real, code-generated href (see lib/sendgrid.ts); this is only
// ever used by the admin editor's preview.
export const EMAIL_TEMPLATE_SAMPLE_HREF: Record<EmailTemplateType, string> = {
  reaction: "/circle",
  root_for: "/growing",
  new_book: "/library",
  birthday: "/library",
  unlock_alert: "/admin/books/00000000-0000-0000-0000-000000000000",
  grove_post: "/grove",
};

// Field-by-field fallback, not whole-row: an admin who only customizes
// the subject shouldn't have to also re-type the body just to save
// that one change -- each field independently falls back to this
// type's hardcoded default when the DB value is null or blank.
export function resolveEmailTemplate(type: EmailTemplateType, row: EmailTemplateRow | null): EmailTemplateFields {
  const def = DEFAULT_EMAIL_TEMPLATES[type];
  return {
    subject: row?.subject?.trim() || def.subject,
    heading: row?.heading?.trim() || def.heading,
    body: row?.body?.trim() || def.body,
    buttonLabel: row?.button_label?.trim() || def.buttonLabel,
  };
}

// Nicknames and other reactor/rooter names are free-form user input
// (see app/api/check-nickname/route.ts, uniqueness-only) -- escaped
// here whenever a value is substituted into HTML. The admin-authored
// template text itself is trusted (admin-only input, gated by RLS) and
// is never escaped; only the substituted VALUES are, since those carry
// arbitrary reader-supplied strings. Never applied to the plain-text
// render -- there's no markup to break there.
function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function substitute(template: string, vars: Record<string, string>, escapeValues: boolean): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
    const value = vars[key] ?? "";
    return escapeValues ? escapeHtml(value) : value;
  });
}

export const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://stillgrowing.co";

const wrap = (innerHtml: string) => `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#FBF7F2;font-family:Georgia,'Playfair Display',serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#FBF7F2;padding:40px 20px;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;padding:40px;border:1px solid #F7E1E9;">
        <tr><td>
          <img src="${siteUrl}/brand/logo-email.png" width="220" height="57" alt="Still Growing" style="display:block;margin:0 0 32px;border:0;" />
          ${innerHtml}
          <p style="margin:40px 0 0;font-size:12px;color:#b0b0b0;font-family:sans-serif;">
            You're receiving this because you have an account at <a href="${siteUrl}" style="color:#C76A8A;">stillgrowing.co</a>.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

const btn = (href: string, label: string) =>
  `<a href="${href}" style="display:inline-block;margin-top:24px;padding:12px 28px;background:#4A2C3D;color:#ffffff;text-decoration:none;border-radius:12px;font-family:sans-serif;font-size:14px;font-weight:500;">${label}</a>`;

// The one render path used by both a real send (lib/sendgrid.ts's per-
// type wrapper functions) and the admin editor's live preview -- fed
// real values in production, EMAIL_TEMPLATE_SAMPLE_VARS in the preview,
// nothing else differs. `body` may contain blank-line-separated
// paragraphs (matching this project's existing plain-text template
// convention of joining sentences with "\n\n"); each becomes its own
// <p> in the HTML render, with single newlines inside a paragraph kept
// as <br/> rather than collapsed.
export function renderEmailHtml(fields: EmailTemplateFields, vars: Record<string, string>, ctaHref: string): string {
  const heading = substitute(fields.heading, vars, true);
  const buttonLabel = substitute(fields.buttonLabel, vars, true);
  const bodyHtml = substitute(fields.body, vars, true)
    .split(/\n\n+/)
    .map(
      (paragraph, i) =>
        `<p style="margin:${i === 0 ? "0" : "16px"} 0 0;font-size:16px;line-height:1.7;color:${
          i === 0 ? "#3A3A3A" : "#888"
        };font-family:sans-serif;">${paragraph.replace(/\n/g, "<br/>")}</p>`
    )
    .join("");

  return wrap(`
    <h1 style="margin:0 0 16px;font-size:24px;color:#4A2C3D;font-weight:normal;">${heading}</h1>
    ${bodyHtml}
    ${btn(ctaHref, buttonLabel)}
  `);
}

// Subject needs its own substitution call, separate from
// renderEmailHtml/Text: several defaults embed a placeholder in the
// subject line itself ("Happy birthday, {{nickname}}!", "New in your
// Library: {{bookTitle}}"), and callers that loop over many recipients
// with per-recipient vars (the birthdays cron's {{nickname}}, the
// unlock-alert cron's per-book {{bookTitle}}) must re-substitute this
// once per recipient/iteration, not once for the whole batch the way
// notifyBookLaunch/notifyGrovePost's shared vars allow for html/text.
// Plain text, never escaped -- an email subject line has no markup to
// break.
export function renderEmailSubject(fields: EmailTemplateFields, vars: Record<string, string>): string {
  return substitute(fields.subject, vars, false);
}

export function renderEmailText(fields: EmailTemplateFields, vars: Record<string, string>, ctaHref: string): string {
  const heading = substitute(fields.heading, vars, false);
  const body = substitute(fields.body, vars, false);
  const buttonLabel = substitute(fields.buttonLabel, vars, false);
  return `${heading}\n\n${body}\n\n${buttonLabel}: ${ctaHref}`;
}
