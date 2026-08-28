export const dynamic = "force-dynamic";

import ReactMarkdown from "react-markdown";
import { createClient } from "@/lib/supabase/server";
import AppShell, { fetchAppShellData } from "@/components/AppShell";
import GroveMedia from "@/components/GroveMedia";

type Post = {
  id: string;
  title: string;
  body: string;
  media_url: string | null;
  published_at: string | null;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en", { month: "long", day: "numeric", year: "numeric" });
}

// Wrapped in AppShell (unlike app/reviews/page.tsx and
// app/r/[shareId]/page.tsx, which stay bare) because, unlike those two,
// Grove now has an in-app entry point -- the header's Grove icon
// (components/AppNav.tsx) -- so a signed-in reader who clicks it needs a
// way back. AppShell's own `if (!user) return <div className="pt-14">...`
// branch means this stays exactly as reachable cold (no header/nav, no
// redirect) for a signed-out visitor or a shared link as it was before.
// requireNickname={false} because Grove is content, not something that
// should force an incomplete signup into /onboarding.
//
// grove_posts has a direct "published or admin" RLS policy, same shape as
// books/collections (0010_coming_soon_rls.sql) -- nothing in a grove post
// is sensitive the way a pending/rejected review or its author is, so
// querying directly here (rather than through a service-role API route
// like reviews) is the simpler, equally-safe choice, not an inconsistency.
export default async function GrovePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fired now, alongside this page's own grove_posts query below, instead
  // of left for AppShell to fetch strictly after this function returns --
  // same parallel-fetch pattern as bb4b115. Signed-in viewers only;
  // AppShell renders the signed-out case without needing this at all.
  const appShellDataPromise = user ? fetchAppShellData(supabase, user.id) : undefined;

  const { data: rawPosts } = await supabase
    .from("grove_posts")
    .select("id, title, body, media_url, published_at")
    .eq("status", "published")
    .order("published_at", { ascending: false });

  const posts: Post[] = rawPosts ?? [];

  // Stamps "last seen the Grove" for the nav icon's unseen-post indicator
  // (components/AppNav.tsx, computed in components/AppShell.tsx) --
  // signed-in viewers only, best-effort (a failed stamp just means the
  // icon might show as new again next visit, not a broken page). Every
  // visit stamps unconditionally, same "no per-post read tracking"
  // simplicity as CircleFeed.tsx's own last-visit stamp.
  if (user) {
    await supabase.from("users").update({ last_seen_grove_at: new Date().toISOString() }).eq("id", user.id);
  }

  return (
    <AppShell requireNickname={false} user={user} dataPromise={appShellDataPromise}>
      <main className="max-w-2xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <p className="text-xs uppercase tracking-widest text-pink-deep mb-3">Still Growing</p>
          <h1 className="text-4xl mb-2">The Grove</h1>
          <p className="text-gray-400 italic text-sm">Videos, quotes, and updates from Still Growing.</p>
        </div>

        {posts.length === 0 ? (
          <p className="text-center text-gray-400 italic py-16">Nothing here yet. Check back soon.</p>
        ) : (
          <div className="space-y-8">
            {posts.map((post) => (
              <article
                key={post.id}
                id={post.id}
                className="bg-white border border-pink-pale rounded-xl2 p-6 scroll-mt-8"
              >
                <h2 className="text-2xl font-display text-plum mb-1">{post.title}</h2>
                {post.published_at && (
                  <p className="text-xs text-gray-400 mb-4">{formatDate(post.published_at)}</p>
                )}
                {post.media_url && (
                  <div className="mb-4">
                    <GroveMedia url={post.media_url} />
                  </div>
                )}
                <div className="text-ink leading-relaxed prose prose-sm max-w-none prose-headings:font-display prose-headings:text-plum prose-a:text-pink-deep">
                  <ReactMarkdown>{post.body}</ReactMarkdown>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </AppShell>
  );
}
