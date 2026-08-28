// NOTE: file kept as lib/sendgrid.ts (not renamed) so the two existing
// import sites (lib/notifications.ts, app/api/cron/birthdays/route.ts)
// don't need to change. The actual provider is Resend as of 2026-08-18 —
// see the "Still Growing" project's Resend/Namecheap DNS setup notes.
const RESEND_URL = "https://api.resend.com/emails";
const FROM_EMAIL = "hello@stillgrowing.co";
const FROM_NAME = "Still Growing";
const TIMEOUT_MS = 5_000;

export interface MailOptions {
  to: string;
  subject: string;
  text: string;
  html: string;
}

// Returns true if the email was accepted by Resend (2xx), false otherwise.
// Never throws. Errors are logged and the caller can check the return value.
export async function sendEmail({ to, subject, text, html }: MailOptions): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[resend] RESEND_API_KEY not set, skipping email to:", to);
    return false;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(RESEND_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: [to],
        subject,
        text,
        html,
      }),
    });

    if (res.ok) return true;

    const errBody = await res.text().catch(() => "(unreadable)");
    console.error(`[resend] Send to ${to} failed ${res.status}: ${errBody}`);
    return false;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      console.error(`[resend] Send to ${to} timed out after 5 s`);
    } else {
      console.error(`[resend] Unexpected error sending to ${to}:`, err);
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
          <img src="${siteUrl}/brand/logo-email.png" width="220" height="57" alt="Still Growing" style="display:block;margin:0 0 32px;border:0;" />
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

// Nicknames are free-form user input (no character restriction -- see
// app/api/check-nickname/route.ts, uniqueness-only), and reactionEmailHtml/
// rootForEmailHtml below now interpolate one directly into HTML. Escaped
// here rather than left as the only unescaped user-controlled string in
// this file's templates.
const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const profileLink = (name: string, userId: string) =>
  `<a href="${siteUrl}/u/${userId}" style="color:#C76A8A;font-weight:bold;text-decoration:none;">${escapeHtml(name)}</a>`;

// bookSlug/reflectionId are optional and only produce the deep link when
// BOTH are present -- same URL shape NotificationPanel.tsx already builds
// for the bell (?book=<slug>&highlight=<id>), falling back to the plain
// /circle link for any notification predating this, or the rare case the
// book lookup came back empty.
export function reactionEmailHtml(
  reactorName: string,
  reactorUserId: string,
  chapterNumber: number,
  bookSlug?: string,
  reflectionId?: string
): string {
  const circleHref =
    bookSlug && reflectionId ? `${siteUrl}/circle?book=${bookSlug}&highlight=${reflectionId}` : `${siteUrl}/circle`;
  return wrap(`
    <h1 style="margin:0 0 16px;font-size:24px;color:#4A2C3D;font-weight:normal;">Someone felt what you wrote.</h1>
    <p style="margin:0;font-size:16px;line-height:1.7;color:#3A3A3A;font-family:sans-serif;">
      ${profileLink(reactorName, reactorUserId)} felt what you wrote in
      <strong>Chapter&nbsp;${chapterNumber}</strong> and reacted with "I felt this."
    </p>
    <p style="margin:16px 0 0;font-size:15px;line-height:1.7;color:#888;font-family:sans-serif;">
      Your words are landing. Keep going.
    </p>
    ${btn(circleHref, "Visit the Circle →")}
  `);
}

export function reactionEmailText(
  reactorName: string,
  reactorUserId: string,
  chapterNumber: number,
  bookSlug?: string,
  reflectionId?: string
): string {
  const circleHref =
    bookSlug && reflectionId ? `${siteUrl}/circle?book=${bookSlug}&highlight=${reflectionId}` : `${siteUrl}/circle`;
  const profileHref = `${siteUrl}/u/${reactorUserId}`;
  return `${reactorName} felt what you wrote in Chapter ${chapterNumber}.\n\nView their profile: ${profileHref}\nVisit the Circle: ${circleHref}`;
}

export function rootForEmailHtml(rooterName: string, rooterUserId: string): string {
  return wrap(`
    <h1 style="margin:0 0 16px;font-size:24px;color:#4A2C3D;font-weight:normal;">Someone started rooting for you.</h1>
    <p style="margin:0;font-size:16px;line-height:1.7;color:#3A3A3A;font-family:sans-serif;">
      ${profileLink(rooterName, rooterUserId)} is standing behind your growth.
    </p>
    <p style="margin:16px 0 0;font-size:15px;line-height:1.7;color:#888;font-family:sans-serif;">
      You're not doing this alone.
    </p>
    ${btn(`${siteUrl}/growing`, "See your Growing page →")}
  `);
}

export function rootForEmailText(rooterName: string, rooterUserId: string): string {
  const profileHref = `${siteUrl}/u/${rooterUserId}`;
  return `${rooterName} started rooting for you.\n\nView their profile: ${profileHref}\nSee your Growing page: ${siteUrl}/growing`;
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

export function birthdayEmailHtml(nickname: string): string {
  return wrap(`
    <h1 style="margin:0 0 16px;font-size:24px;color:#4A2C3D;font-weight:normal;">Happy birthday, ${nickname}!</h1>
    <p style="margin:0;font-size:16px;line-height:1.7;color:#3A3A3A;font-family:sans-serif;">
      Today is a good day to remember. You were born ready. And still are.
    </p>
    <p style="margin:16px 0 0;font-size:15px;line-height:1.7;color:#888;font-family:sans-serif;">
      Keep growing. Keep going.
    </p>
    ${btn(`${siteUrl}/library`, "Continue your journey →")}
  `);
}

export function birthdayEmailText(nickname: string): string {
  return `Happy birthday, ${nickname}!\n\nToday is a good day to remember. You were born ready. Still are.\n\nKeep growing. ${siteUrl}/library`;
}
