// NOTE: file kept as lib/sendgrid.ts (not renamed) so the two existing
// import sites (lib/notifications.ts, app/api/cron/birthdays/route.ts)
// don't need to change. The actual provider is Resend as of 2026-08-18 —
// see the "Still Growing" project's Resend/Namecheap DNS setup notes.
const RESEND_URL = "https://api.resend.com/emails";
const RESEND_BATCH_URL = "https://api.resend.com/emails/batch";
const FROM_EMAIL = "hello@stillgrowing.co";
const FROM_NAME = "Still Growing";
const TIMEOUT_MS = 5_000;
const BATCH_TIMEOUT_MS = 10_000;
// Resend's own per-call cap on the batch endpoint (checked against their
// current docs, 2026-09: "trigger up to 100 batch emails at once").
const BATCH_CHUNK_SIZE = 100;
// Resend's default rate limit is 10 requests/second per team (also
// checked against current docs, not assumed) -- each chunk below is one
// request regardless of how many recipients it contains, so even
// back-to-back chunks would need >1000 total recipients per second to
// approach that limit. This delay is extra headroom, not the only thing
// keeping this under the limit, so this send never contends with other
// transactional email (reactions, root-for, book launch) firing at the
// same moment.
const BATCH_CHUNK_DELAY_MS = 250;

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

export interface BatchRecipient {
  to: string;
  subject: string;
  text: string;
  html: string;
}

// Sends one email per recipient via Resend's real /emails/batch endpoint
// (an array of up to 100 separate email objects per call, each with its
// own single-recipient `to`) rather than looping sendEmail() once per
// user, and rather than grouping multiple real users into one email's
// `to` array (which would leak every recipient's address to every other
// recipient in that group -- never do that for a broadcast). Built for
// lib/notifications.ts's notifyGrovePost specifically because
// notifyBookLaunch's unthrottled per-user Promise.allSettled fan-out was
// already a known, flagged gap -- Grove is expected to send far more
// often than book launches ever did, so this needed real batching from
// the start rather than copying that pattern. Never throws; returns
// per-recipient success so the caller can decide what to do with
// failures (same contract shape as sendEmail's boolean return, just
// per-recipient).
export async function sendBatchEmails(
  recipients: BatchRecipient[]
): Promise<{ email: string; sent: boolean }[]> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn(`[resend] RESEND_API_KEY not set, skipping batch send to ${recipients.length} recipient(s)`);
    return recipients.map((r) => ({ email: r.to, sent: false }));
  }

  const results: { email: string; sent: boolean }[] = [];

  for (let i = 0; i < recipients.length; i += BATCH_CHUNK_SIZE) {
    const chunk = recipients.slice(i, i + BATCH_CHUNK_SIZE);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), BATCH_TIMEOUT_MS);

    try {
      const res = await fetch(RESEND_BATCH_URL, {
        method: "POST",
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          chunk.map((r) => ({
            from: `${FROM_NAME} <${FROM_EMAIL}>`,
            to: [r.to],
            subject: r.subject,
            text: r.text,
            html: r.html,
          }))
        ),
      });

      if (res.ok) {
        // A 2xx here means Resend accepted the whole chunk (its batch
        // response is one queued-id per email, in request order) --
        // there's no documented partial-failure-within-a-2xx shape for
        // this endpoint, so a successful call marks every email in that
        // chunk sent; any real per-message bounce/failure would surface
        // later via Resend's own delivery webhooks/dashboard, same as
        // any other email sent through this file today.
        chunk.forEach((r) => results.push({ email: r.to, sent: true }));
      } else {
        const errBody = await res.text().catch(() => "(unreadable)");
        console.error(`[resend] Batch send (${chunk.length} recipients) failed ${res.status}: ${errBody}`);
        chunk.forEach((r) => results.push({ email: r.to, sent: false }));
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        console.error(`[resend] Batch send (${chunk.length} recipients) timed out after ${BATCH_TIMEOUT_MS / 1000}s`);
      } else {
        console.error(`[resend] Batch send (${chunk.length} recipients) errored:`, err);
      }
      chunk.forEach((r) => results.push({ email: r.to, sent: false }));
    } finally {
      clearTimeout(timer);
    }

    if (i + BATCH_CHUNK_SIZE < recipients.length) {
      await new Promise((resolve) => setTimeout(resolve, BATCH_CHUNK_DELAY_MS));
    }
  }

  return results;
}

// ── Email templates ──────────────────────────────────────────────────────────
//
// The actual html/text rendering (wrap()/btn(), placeholder substitution,
// escaping) now lives in lib/emailTemplates.ts -- pure/isomorphic so the
// admin editor's live preview can import it too. This file's job is
// just: fetch the admin's saved copy (or the hardcoded default) for a
// type, and expose the same 12 function names as before so
// lib/notifications.ts / app/api/cron/birthdays/route.ts don't need a
// wider rewrite -- each now takes the resolved EmailTemplateFields as
// its first argument (fetched once per send, not once per recipient --
// see notifyBookLaunch/notifyGrovePost's own comments for why that
// matters for a bulk send) instead of reading hardcoded strings.

import { createAdminClient } from "@/lib/supabase/admin";
import {
  type EmailTemplateType,
  type EmailTemplateFields,
  type EmailTemplateRow,
  resolveEmailTemplate,
  renderEmailHtml,
  renderEmailText,
  renderEmailSubject,
  siteUrl,
} from "@/lib/emailTemplates";

export type { EmailTemplateFields };
export { renderEmailSubject };

// Reads this type's row (falling back to the hardcoded default field by
// field -- see resolveEmailTemplate) via the service-role client, same
// as every other read this file's callers already do through
// createAdminClient(). Never throws: a query failure just means every
// field falls back to its default, same as a genuinely empty row.
export async function getEmailTemplate(type: EmailTemplateType): Promise<EmailTemplateFields> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("email_templates")
      .select("type, subject, heading, body, button_label")
      .eq("type", type)
      .maybeSingle();
    return resolveEmailTemplate(type, data as EmailTemplateRow | null);
  } catch (err) {
    console.error(`[sendgrid] getEmailTemplate(${type}) error:`, err);
    return resolveEmailTemplate(type, null);
  }
}

// bookSlug/reflectionId are optional and only produce the deep link when
// BOTH are present -- same URL shape NotificationPanel.tsx already builds
// for the bell (?book=<slug>&highlight=<id>), falling back to the plain
// /circle link for any notification predating this, or the rare case the
// book lookup came back empty.
export function reactionEmailHtml(
  fields: EmailTemplateFields,
  reactorName: string,
  chapterNumber: number,
  bookSlug?: string,
  reflectionId?: string
): string {
  const circleHref =
    bookSlug && reflectionId ? `${siteUrl}/circle?book=${bookSlug}&highlight=${reflectionId}` : `${siteUrl}/circle`;
  return renderEmailHtml(fields, { reactorName, chapterNumber: String(chapterNumber) }, circleHref);
}

export function reactionEmailText(
  fields: EmailTemplateFields,
  reactorName: string,
  chapterNumber: number,
  bookSlug?: string,
  reflectionId?: string
): string {
  const circleHref =
    bookSlug && reflectionId ? `${siteUrl}/circle?book=${bookSlug}&highlight=${reflectionId}` : `${siteUrl}/circle`;
  return renderEmailText(fields, { reactorName, chapterNumber: String(chapterNumber) }, circleHref);
}

export function rootForEmailHtml(fields: EmailTemplateFields, rooterName: string): string {
  return renderEmailHtml(fields, { rooterName }, `${siteUrl}/growing`);
}

export function rootForEmailText(fields: EmailTemplateFields, rooterName: string): string {
  return renderEmailText(fields, { rooterName }, `${siteUrl}/growing`);
}

export function newBookEmailHtml(fields: EmailTemplateFields, bookTitle: string): string {
  return renderEmailHtml(fields, { bookTitle }, `${siteUrl}/library`);
}

export function newBookEmailText(fields: EmailTemplateFields, bookTitle: string): string {
  return renderEmailText(fields, { bookTitle }, `${siteUrl}/library`);
}

export function birthdayEmailHtml(fields: EmailTemplateFields, nickname: string): string {
  return renderEmailHtml(fields, { nickname }, `${siteUrl}/library`);
}

export function birthdayEmailText(fields: EmailTemplateFields, nickname: string): string {
  return renderEmailText(fields, { nickname }, `${siteUrl}/library`);
}

// Sent only when a book's trailing-24h unverified-unlock count first
// crosses into abnormal territory (app/api/cron/unlock-alert's edge-
// trigger) -- the default copy deliberately says "not necessarily
// piracy" up front. Amazon buyers, gift recipients, and checkout/
// sign-in email mismatches are always unverified too, so a genuinely
// abnormal cluster is a prompt to go look, not an accusation.
export function unlockClusterAlertEmailHtml(
  fields: EmailTemplateFields,
  bookTitle: string,
  unverifiedCount: number,
  bookId: string
): string {
  return renderEmailHtml(fields, { bookTitle, unverifiedCount: String(unverifiedCount) }, `${siteUrl}/admin/books/${bookId}`);
}

export function unlockClusterAlertEmailText(
  fields: EmailTemplateFields,
  bookTitle: string,
  unverifiedCount: number,
  bookId: string
): string {
  return renderEmailText(fields, { bookTitle, unverifiedCount: String(unverifiedCount) }, `${siteUrl}/admin/books/${bookId}`);
}

// Sent to every (opted-in) member when an admin publishes a Grove post
// (the draft->published transition only -- re-editing an already-
// published post does not re-send, matching GrovePostForm.tsx's own
// nowPublishing check). The link reuses the exact ?post=<id>#<id> shape
// already established for sharing/OG (GrovePostActions.tsx, app/grove/
// page.tsx's generateMetadata) so it both lands the reader directly on
// the post and unfurls correctly if forwarded.
export function groveNewPostEmailHtml(fields: EmailTemplateFields, title: string, excerpt: string, postId: string): string {
  return renderEmailHtml(fields, { title, excerpt }, `${siteUrl}/grove?post=${postId}#${postId}`);
}

export function groveNewPostEmailText(fields: EmailTemplateFields, title: string, excerpt: string, postId: string): string {
  return renderEmailText(fields, { title, excerpt }, `${siteUrl}/grove?post=${postId}#${postId}`);
}
