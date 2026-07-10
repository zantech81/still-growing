import { createAdminClient } from "@/lib/supabase/admin";
import {
  sendEmail,
  reactionEmailHtml,
  reactionEmailText,
  newBookEmailHtml,
  newBookEmailText,
} from "@/lib/sendgrid";

// ── Reaction notification ────────────────────────────────────────────────────

// Called after a reaction insert. Looks up the reflection author, skips
// self-reactions, inserts a notification row, sends the email, and marks
// email_sent. Never throws — all errors are logged.
export async function notifyReaction(
  reflectionId: string,
  reactorUserId: string
): Promise<void> {
  try {
    const supabase = createAdminClient();

    // Fetch reflection + author email in one query.
    const { data: reflection } = await supabase
      .from("reflections")
      .select("user_id, chapter_number, users(email)")
      .eq("id", reflectionId)
      .single();

    if (!reflection) return;

    // No self-notification.
    if (reflection.user_id === reactorUserId) return;

    const author = reflection.users as unknown as { email: string } | null;
    if (!author?.email) return;

    // Insert notification row first (in-app layer, independent of email).
    const { data: notif } = await supabase
      .from("notifications")
      .insert({
        user_id: reflection.user_id,
        type: "reaction",
        payload: {
          reflection_id: reflectionId,
          chapter_number: reflection.chapter_number,
        },
        email_sent: false,
      })
      .select("id")
      .single();

    // Send email; mark sent only if it succeeds.
    const sent = await sendEmail({
      to: author.email,
      subject: "Someone in the Circle felt what you wrote",
      text: reactionEmailText(reflection.chapter_number),
      html: reactionEmailHtml(reflection.chapter_number),
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

// ── New book notification ────────────────────────────────────────────────────

// Called when an admin publishes a book. Sends to all platform members.
// Inserts a notification row per user regardless of whether the email
// succeeds, and marks email_sent only for successful sends.
// Never throws — all errors are logged.
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
