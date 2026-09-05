import { createAdminClient } from "@/lib/supabase/admin";
import {
  sendEmail,
  sendBatchEmails,
  getEmailTemplate,
  renderEmailSubject,
  reactionEmailHtml,
  reactionEmailText,
  rootForEmailHtml,
  rootForEmailText,
  newBookEmailHtml,
  newBookEmailText,
  groveNewPostEmailHtml,
  groveNewPostEmailText,
} from "@/lib/sendgrid";
import { excerptFromMarkdown } from "@/lib/grove";

// ── Reaction notification ────────────────────────────────────────────────────

// Called after a reaction insert. Looks up the reflection author, skips
// self-reactions, inserts a notification row, sends the email (unless
// the author has turned reaction emails off -- notify_reaction, see
// 0060_email_templates_and_preferences.sql), and marks email_sent. The
// in-app notification row is inserted regardless of that preference --
// email and in-app are already separately tracked (email_sent on the
// row), so opting out of email must not also silently kill the bell/
// badge for the same event. Never throws. All errors are logged.
export async function notifyReaction(
  reflectionId: string,
  reactorUserId: string
): Promise<void> {
  try {
    const supabase = createAdminClient();

    // Reflection (+ author email/preference, book slug for the bell's
    // deep link) and the reactor's own public name, fetched in parallel
    // rather than one after the other -- two independent lookups, no
    // reason to serialize them.
    const [{ data: reflection }, { data: reactor }] = await Promise.all([
      supabase
        .from("reflections")
        .select("user_id, chapter_number, book_id, books(slug), users(email, notify_reaction)")
        .eq("id", reflectionId)
        .single(),
      // public_profiles, not users directly: same reasoning as
      // getGrowingTreeExtra in lib/connections.ts -- this is someone
      // other than an RLS-scoped caller (there is none here, this runs
      // through the service-role client), and it's the safe public
      // column subset this is meant to show anyway.
      supabase.from("public_profiles").select("nickname, display_name").eq("id", reactorUserId).maybeSingle(),
    ]);

    if (!reflection) return;

    // No self-notification.
    if (reflection.user_id === reactorUserId) return;

    const authorRaw = reflection.users as unknown;
    const author = (Array.isArray(authorRaw) ? authorRaw[0] : authorRaw) as
      | { email: string; notify_reaction: boolean }
      | null;
    if (!author?.email) return;

    // PostgREST many-to-one joins normally come back as a single object,
    // but this normalizes defensively in case the shape ever comes back
    // as an array -- same pattern as CircleFeed.tsx's getAuthor().
    const booksRaw = reflection.books as unknown;
    const book = (Array.isArray(booksRaw) ? booksRaw[0] : booksRaw) as { slug: string } | null;
    const reactorName = reactor?.nickname ?? reactor?.display_name ?? "A reader";

    // Insert notification row first (in-app layer, independent of email
    // and of the notify_reaction preference below).
    const { data: notif } = await supabase
      .from("notifications")
      .insert({
        user_id: reflection.user_id,
        type: "reaction",
        payload: {
          reflection_id: reflectionId,
          chapter_number: reflection.chapter_number,
          book_slug: book?.slug ?? null,
        },
        email_sent: false,
      })
      .select("id")
      .single();

    if (author.notify_reaction === false) return;

    const fields = await getEmailTemplate("reaction");
    const subjectVars = { reactorName, chapterNumber: String(reflection.chapter_number) };
    const sent = await sendEmail({
      to: author.email,
      subject: renderEmailSubject(fields, subjectVars),
      text: reactionEmailText(fields, reactorName, reflection.chapter_number, book?.slug, reflectionId),
      html: reactionEmailHtml(fields, reactorName, reflection.chapter_number, book?.slug, reflectionId),
    });

    if (sent && notif?.id) {
      await supabase
        .from("notifications")
        .update({ email_sent: true })
        .eq("id", notif.id);
    }
  } catch (err) {
    console.error("[notifications] notifyReaction error:", err);
  }
}

// ── Root for notification ────────────────────────────────────────────────────

// Called after a fresh "root for" connection insert (not a duplicate --
// see app/api/connections/route.ts's own 23505 handling). Mirrors
// notifyReaction's exact shape, preference check included. Never
// throws. All errors are logged.
export async function notifyRootFor(rootedForUserId: string, rooterUserId: string): Promise<void> {
  try {
    const supabase = createAdminClient();

    const [{ data: rootedForUser }, { data: rooter }] = await Promise.all([
      supabase.from("users").select("email, notify_root_for").eq("id", rootedForUserId).single(),
      // public_profiles, not users -- same reasoning as notifyReaction's
      // reactor lookup above.
      supabase.from("public_profiles").select("nickname, display_name").eq("id", rooterUserId).maybeSingle(),
    ]);

    if (!rootedForUser?.email) return;

    const rooterName = rooter?.nickname ?? rooter?.display_name ?? "A reader";

    // Insert notification row first (in-app layer, independent of email
    // and of the notify_root_for preference below).
    const { data: notif } = await supabase
      .from("notifications")
      .insert({
        user_id: rootedForUserId,
        type: "root_for",
        payload: {},
        email_sent: false,
      })
      .select("id")
      .single();

    if (rootedForUser.notify_root_for === false) return;

    const fields = await getEmailTemplate("root_for");
    const sent = await sendEmail({
      to: rootedForUser.email,
      subject: renderEmailSubject(fields, { rooterName }),
      text: rootForEmailText(fields, rooterName),
      html: rootForEmailHtml(fields, rooterName),
    });

    if (sent && notif?.id) {
      await supabase
        .from("notifications")
        .update({ email_sent: true })
        .eq("id", notif.id);
    }
  } catch (err) {
    console.error("[notifications] notifyRootFor error:", err);
  }
}

// ── New book notification ────────────────────────────────────────────────────

// Called when an admin publishes a book. Sends to all platform members
// who haven't opted out (notify_new_book). Inserts a notification row
// per user regardless of that preference or of whether the email
// succeeds, and marks email_sent only for successful, opted-in sends.
// The template is fetched once up front, not once per user -- this can
// run over every member on the platform, and a per-recipient DB read
// would be pure waste. Rebuilt to use the same one-bulk-insert /
// filter-before-building / sendBatchEmails shape as notifyGrovePost
// below, rather than the unthrottled per-user Promise.allSettled fan-out
// (N inserts, N individual sendEmail() calls, N individual updates) this
// used to be -- see notifyGrovePost's own comment for why that pattern
// doesn't scale. Never throws. All errors are logged.
export async function notifyBookLaunch(bookId: string): Promise<void> {
  try {
    const supabase = createAdminClient();

    const [{ data: book }, { data: users }, fields] = await Promise.all([
      supabase.from("books").select("title, slug").eq("id", bookId).single(),
      supabase.from("users").select("id, email, notify_new_book"),
      getEmailTemplate("new_book"),
    ]);

    if (!book || !users?.length) return;

    // Same for every recipient (bookTitle doesn't vary per user), so
    // substituted once here rather than once per user below.
    const subject = renderEmailSubject(fields, { bookTitle: book.title });

    // One bulk insert for every user's in-app notification row, not
    // users.length separate ones -- this happens regardless of
    // notify_new_book, same as before, since it also drives the bell/dot,
    // not just email. .select("id, user_id") back so a later successful
    // send can be marked without a second per-user query.
    const { data: notifRows } = await supabase
      .from("notifications")
      .insert(
        users.map((user) => ({
          user_id: user.id,
          type: "new_book" as const,
          payload: {
            book_id: bookId,
            book_title: book.title,
            book_slug: book.slug,
          },
          email_sent: false,
        }))
      )
      .select("id, user_id");

    const notifIdByUserId = new Map((notifRows ?? []).map((n) => [n.user_id as string, n.id as string]));

    // Same "filter to opted-in users with a real email before building
    // anything" shape as notifyGrovePost. users.email is `unique not
    // null` (0001_init.sql, confirmed against the live table -- no user
    // row has ever had a null email), so joining a sendBatchEmails result
    // back to its notification row by email below is an exact match, not
    // a heuristic.
    const recipients = users
      .filter((u) => u.notify_new_book !== false && u.email)
      .map((u) => ({
        to: u.email as string,
        subject,
        text: newBookEmailText(fields, book.title),
        html: newBookEmailHtml(fields, book.title),
      }));

    if (recipients.length === 0) return;

    const results = await sendBatchEmails(recipients);
    const failed = results.filter((r) => !r.sent).length;
    if (failed > 0) {
      console.error(`[notifications] notifyBookLaunch: ${failed}/${results.length} emails failed for book ${bookId}`);
    }

    const userIdByEmail = new Map(users.map((u) => [u.email as string, u.id as string]));
    const successNotifIds = results
      .filter((r) => r.sent)
      .map((r) => userIdByEmail.get(r.email))
      .filter((userId): userId is string => !!userId)
      .map((userId) => notifIdByUserId.get(userId))
      .filter((id): id is string => !!id);

    // One bulk update for every successful send, not a per-recipient
    // UPDATE in a loop -- that would just move the fan-out problem from
    // email-sending to the database.
    if (successNotifIds.length > 0) {
      await supabase.from("notifications").update({ email_sent: true }).in("id", successNotifIds);
    }
  } catch (err) {
    console.error("[notifications] notifyBookLaunch error:", err);
  }
}

// ── Grove post notification ──────────────────────────────────────────────────

// Called when an admin publishes a Grove post (the draft->published
// transition only -- GrovePostForm.tsx's own nowPublishing check already
// ensures re-editing an already-published post never calls this again).
// Email only, deliberately: no `notifications` row is inserted here (Grove
// posts stay out of the in-app bell entirely -- the header's Grove leaf
// icon + last_seen_grove_at already serve as the unread indicator, and
// grove_reactions stay "purely statistical" per Zan's original
// instruction, neither in scope here). Filters out notify_grove_post=false
// recipients BEFORE building the batch (cheaper than sending then
// discarding, and keeps sendBatchEmails' 100/chunk math accurate). Uses
// sendBatchEmails (lib/sendgrid.ts) rather than notifyBookLaunch's
// unthrottled per-user Promise.allSettled fan-out above -- Grove is
// expected to become the primary, far more frequent update channel, so
// this needed real batching from the start. Never throws. All errors
// are logged.
export async function notifyGrovePost(postId: string): Promise<void> {
  try {
    const supabase = createAdminClient();

    const [{ data: post }, { data: users }, fields] = await Promise.all([
      supabase.from("grove_posts").select("title, body").eq("id", postId).single(),
      supabase.from("users").select("email, notify_grove_post"),
      getEmailTemplate("grove_post"),
    ]);

    if (!post || !users?.length) return;

    const excerpt = excerptFromMarkdown(post.body, 200);
    // Same for every recipient (title/excerpt don't vary per user), so
    // substituted once here rather than once per recipient below.
    const subject = renderEmailSubject(fields, { title: post.title, excerpt });
    const recipients = users
      .filter((u) => u.notify_grove_post !== false)
      .map((u) => u.email as string | null)
      .filter((email): email is string => !!email)
      .map((email) => ({
        to: email,
        subject,
        text: groveNewPostEmailText(fields, post.title, excerpt, postId),
        html: groveNewPostEmailHtml(fields, post.title, excerpt, postId),
      }));

    if (recipients.length === 0) return;

    const results = await sendBatchEmails(recipients);
    const failed = results.filter((r) => !r.sent).length;
    if (failed > 0) {
      console.error(`[notifications] notifyGrovePost: ${failed}/${results.length} emails failed for post ${postId}`);
    }
  } catch (err) {
    console.error("[notifications] notifyGrovePost error:", err);
  }
}
