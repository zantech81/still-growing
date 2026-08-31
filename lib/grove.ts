import { createClient } from "@/lib/supabase/client";

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
