import { createClient } from "@/lib/supabase/client";

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 1).trimEnd() + "…";
}

// Extracted from app/grove/page.tsx (originally written for its OG
// generateMetadata description) so lib/notifications.ts's Grove-post
// email can reuse the exact same excerpt logic instead of a second,
// slightly different copy. Body is markdown (components/admin/grove-editor),
// not plain text -- a raw truncation could land mid-```mux-video block,
// spitting out a playback id as the excerpt, or leave stray #/**/![]()
// syntax visible. Strips fenced code blocks (mux-video/youtube/any
// genuine code block) and image syntax entirely rather than trying to
// preserve alt text -- neither reads as a sentence in a one-line excerpt
// -- and unwraps every other inline marker down to plain words before
// truncating.
export function excerptFromMarkdown(markdown: string, max: number): string {
  const plain = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/[*_`>#]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return truncate(plain, max);
}

// Publishing a Grove post (GrovePostForm.tsx's save()) auto-points
// site_settings.announcement_link at that post (`/grove#<id>`). Deleting
// a post that's still the announcement's target would otherwise leave
// the live banner pointing at a page that no longer exists. Checked
// before the delete goes through, not after: if the post delete then
// fails, the worst case is the banner turned off early for a post that's
// still live (obvious and easy to reactivate) rather than the dangling
// reference this exists to prevent.
export async function deleteGrovePost(postId: string): Promise<{ error: string | null }> {
  const supabase = createClient();

  const { data: settings } = await supabase
    .from("site_settings")
    .select("announcement_link")
    .eq("id", 1)
    .single();

  if (settings?.announcement_link === `/grove#${postId}`) {
    const { error: announcementError } = await supabase
      .from("site_settings")
      .update({ announcement_active: false })
      .eq("id", 1);
    if (announcementError) {
      return { error: "Could not update the announcement banner. Try again." };
    }
  }

  const { error: deleteError } = await supabase.from("grove_posts").delete().eq("id", postId);
  if (deleteError) {
    return { error: deleteError.message || "Delete failed. Try again." };
  }

  return { error: null };
}
