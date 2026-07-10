const SENDGRID_URL = "https://api.sendgrid.com/v3/mail/send";
const FROM_EMAIL = "hello@stillgrowing.co";
const FROM_NAME = "Still Growing";
const TIMEOUT_MS = 5_000;

export interface MailOptions {
  to: string;
  subject: string;
  text: string;
  html: string;
}

// Returns true if the email was accepted by SendGrid (202), false otherwise.
// Never throws — errors are logged and the caller can check the return value.
export async function sendEmail({ to, subject, text, html }: MailOptions): Promise<boolean> {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) {
    console.warn("[sendgrid] SENDGRID_API_KEY not set — skipping email to:", to);
    return false;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(SENDGRID_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: FROM_EMAIL, name: FROM_NAME },
        subject,
        content: [
          { type: "text/plain", value: text },
          { type: "text/html", value: html },
        ],
      }),
    });

    if (res.status === 202) return true;

    const errBody = await res.text().catch(() => "(unreadable)");
    console.error(`[sendgrid] Send to ${to} failed ${res.status}: ${errBody}`);
    return false;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      console.error(`[sendgrid] Send to ${to} timed out after 5 s`);
    } else {
      console.error(`[sendgrid] Unexpected error sending to ${to}:`, err);
    }
    return false;
  } finally {
    clearTimeout(timer);
  }
}

// ── Email templates ──────────────────────────────────────────────────────────

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://stillgrowing.co";

const wrap = (body: string) => `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#FBF7F2;font-family:Georgia,'Playfair Display',serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#FBF7F2;padding:40px 20px;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;padding:40px;border:1px solid #F7E1E9;">
        <tr><td>
          <p style="margin:0 0 32px;font-family:Georgia,serif;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;color:#C76A8A;">Still Growing</p>
          ${body}
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

export function reactionEmailHtml(chapterNumber: number): string {
  return wrap(`
    <h1 style="margin:0 0 16px;font-size:24px;color:#4A2C3D;font-weight:normal;">Someone felt what you wrote.</h1>
    <p style="margin:0;font-size:16px;line-height:1.7;color:#3A3A3A;font-family:sans-serif;">
      A reader in the Still Growing circle resonated with your reflection from
      <strong>Chapter&nbsp;${chapterNumber}</strong> and reacted with "I felt this."
    </p>
    <p style="margin:16px 0 0;font-size:15px;line-height:1.7;color:#888;font-family:sans-serif;">
      Your words are landing. Keep going.
    </p>
    ${btn(`${siteUrl}/circle`, "Visit the Circle →")}
  `);
}

export function reactionEmailText(chapterNumber: number): string {
  return `Someone in the Still Growing circle felt what you wrote in Chapter ${chapterNumber}.\n\nVisit the Circle: ${siteUrl}/circle`;
}

export function newBookEmailHtml(bookTitle: string, bookSlug: string): string {
  return wrap(`
    <h1 style="margin:0 0 16px;font-size:24px;color:#4A2C3D;font-weight:normal;">Something new just arrived.</h1>
    <p style="margin:0;font-size:16px;line-height:1.7;color:#3A3A3A;font-family:sans-serif;">
      A new book has been added to your Still Growing library:
      <strong>${bookTitle}</strong>.
    </p>
    <p style="margin:16px 0 0;font-size:15px;line-height:1.7;color:#888;font-family:sans-serif;">
      Head over whenever you're ready.
    </p>
    ${btn(`${siteUrl}/library`, "Go to your Library →")}
  `);
}

export function newBookEmailText(bookTitle: string): string {
  return `A new book has been added to your Still Growing library: ${bookTitle}.\n\nVisit your Library: ${siteUrl}/library`;
}
