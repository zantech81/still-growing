import { createAdminClient } from "@/lib/supabase/admin";
import {
  sendEmail,
  reactionEmailHtml,
  reactionEmailText,
  rootForEmailHtml,
  rootForEmailText,
  newBookEmailHtml,
  newBookEmailText,
} from "@/lib/sendgrid";

// ── Reaction notification ────────────────────────────────────────────────────

// Called after a reaction insert. Looks up the reflection author, skips
// self-reactions, inserts a notification row, sends the email, and marks
// email_sent. Never throws. All errors are logged.
export async function notifyReaction(
  reflectionId: string,
  reactorUserId: string
): Promise<void> {
  try {
    const supabase = createAdminClient();

    // Fetch reflection + author email + book slug (for the bell's
    // click-through deep link) in one query.
    const { data: reflection } = await supabase
      .from("reflections")
      .select("user_id, chapter_number, book_id, books(slug), users(email)")
      .eq("id", reflectionId)
      .single();

    if (!reflection) return;

    // No self-notification.
    if (reflection.user_id === reactorUserId) return;

    const author = reflection.users as unknown as { email: string } | null;
    if (!author?.email) return;

    // PostgREST many-to-one joins normally come back as a single object,
    // but this normalizes defensively in case the shape ever comes back
    // as an array -- same pattern as CircleFeed.tsx's getAuthor().
    const booksRaw = reflection.books as unknown;
    const book = (Array.isArray(booksRaw) ? booksRaw[0] : booksRaw) as { slug: string } | null;

    // Insert notification row first (in-app layer, independent of email).
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

    // Send email; mark sent only if it succeeds.
    const sent = await sendEmail({
      to: author.email,
      subject: "Someone in the Circle felt what you wrote",
      text: reactionEmailText(reflection.chapter_number, book?.slug, reflectionId),
      html: reactionEmailHtml(reflection.chapter_number, book?.slug, reflectionId),
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
// notifyReaction's exact shape: look up the recipient's email, skip
// entirely if there isn't one, insert the notification row, send the
// email, and mark email_sent only if it actually succeeds.
// Never throws. All errors are logged.
export async function notifyRootFor(rootedForUserId: string): Promise<void> {
  try {
    const supabase = createAdminClient();

    const { data: rootedForUser } = await supabase
      .from("users")
      .select("email")
      .eq("id", rootedForUserId)
      .single();

    if (!rootedForUser?.email) return;

    // Insert notification row first (in-app layer, independent of email).
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

    // Send email; mark sent only if it succeeds.
    const sent = await sendEmail({
      to: rootedForUser.email,
      subject: "Someone started rooting for you",
      text: rootForEmailText(),
      html: rootForEmailHtml(),
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

// Called when an admin publishes a book. Sends to all platform members.
// Inserts a notification row per user regardless of whether the email
// succeeds, and marks email_sent only for successful sends.
// Never throws. All errors are logged.
export async function notifyBookLaunch(bookId: string): Promise<void> {
  try {
    const supabase = createAdminClient();

    const [{ data: book }, { data: users }] = await Promise.all([
      supabase.from("books").select("title, slug").eq("id", bookId).single(),
      supabase.from("users").select("id, email"),
    ]);

    if (!book || !users?.length) return;

    // Send to all users concurrently; each is independently error-safe.
    await Promise.allSettled(
      users.map(async (user) => {
        // Insert in-app notification row.
        const { data: notif } = await supabase
          .from("notifications")
          .insert({
            user_id: user.id,
            type: "new_book",
            payload: {
              book_id: bookId,
              book_title: book.title,
              book_slug: book.slug,
            },
            email_sent: false,
          })
          .select("id")
          .single();

        const sent = await sendEmail({
          to: user.email,
          subject: `New in your Library: ${book.title}`,
          text: newBookEmailText(book.title),
          html: newBookEmailHtml(book.title, book.slug),
        });

        if (sent && notif?.id) {
          await supabase
            .from("notifications")
            .update({ email_sent: true })
            .eq("id", notif.id);
        }
      })
    );
  } catch (err) {
    console.error("[notifications] notifyBookLaunch error:", err);
  }
}
