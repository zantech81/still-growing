export const dynamic = "force-dynamic";

import Link from "next/link";
import nextDynamic from "next/dynamic";
import { isValidElement, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import { createClient } from "@/lib/supabase/server";
import AppShell, { fetchAppShellData } from "@/components/AppShell";
import GroveMedia from "@/components/GroveMedia";
import GrovePostActions from "@/components/GrovePostActions";

// Dynamically imported, not a static import: @mux/mux-player-react is a
// genuinely heavy client bundle, and most Grove posts won't have an
// inline video at all. A static import would ship that weight to every
// /grove visitor regardless; this way it's its own chunk, fetched only
// when a post's rendered markdown actually contains a mux-video block.
// Aliased to nextDynamic: this file already exports its own `dynamic`
// (Next's route-segment force-dynamic config) below, which would
// otherwise collide with next/dynamic's default import name.
const GroveVideoBlock = nextDynamic(() => import("@/components/GroveVideoBlock"));

// The one targeted override this page's <ReactMarkdown> needs for inline
// video: components/admin/grove-editor/muxVideoBlock.ts writes an inline
// Mux video as a fenced code block, ```mux-video\n{playbackId}\n```, which
// is plain, valid markdown -- every other formatting case (bold, italic,
// headings, lists, links, inline images) renders through ReactMarkdown's
// own defaults completely unchanged. A genuine code block (any other
// language, or none) still renders as a normal <pre>.
function MarkdownPre({ children }: { children?: ReactNode }) {
  const child = Array.isArray(children) ? children[0] : children;
  if (isValidElement<{ className?: string; children?: ReactNode }>(child) && child.props.className === "language-mux-video") {
    const playbackId = String(child.props.children ?? "").trim();
    if (playbackId) {
      return <GroveVideoBlock playbackId={playbackId} />;
    }
  }
  return <pre>{children}</pre>;
}

type Post = {
  id: string;
  title: string;
  body: string;
  media_url: string | null;
  published_at: string | null;
  hearts_count: number;
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
    .select("id, title, body, media_url, published_at, hearts_count")
    .eq("status", "published")
    .order("published_at", { ascending: false });

  const posts: Post[] = rawPosts ?? [];

  // Which of these posts this viewer has already reacted to -- same shape
  // as app/circle/page.tsx's myReactionIds query for CircleFeed. Depends on
  // the post ids above so it can't start any earlier, but it still overlaps
  // with appShellDataPromise's already-in-flight fetch below rather than
  // adding to a strict waterfall.
  let reactedIds = new Set<string>();
  if (user && posts.length > 0) {
    const { data: myReactions } = await supabase
      .from("grove_reactions")
      .select("grove_post_id")
      .eq("user_id", user.id)
      .in("grove_post_id", posts.map((p) => p.id));
    reactedIds = new Set((myReactions ?? []).map((r) => r.grove_post_id as string));
  }

  // Reads the same in-flight fetchAppShellData call AppShell will use below
  // rather than firing a second is_admin query -- awaiting a promise a
  // second time doesn't re-run the underlying Promise.all, it just reads
  // the already-settled (or already-pending) result, so this is free.
  const appShellData = appShellDataPromise ? await appShellDataPromise : undefined;
  const isAdmin = appShellData?.profile?.is_admin ?? false;

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
          {isAdmin && (
            <Link
              href="/admin/grove/new"
              className="inline-block mt-4 text-xs text-pink-deep border border-pink-pale rounded-full px-3 py-1 hover:bg-pink-pale transition-colors"
            >
              + New post
            </Link>
          )}
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
                  <ReactMarkdown components={{ pre: MarkdownPre }}>{post.body}</ReactMarkdown>
                </div>
                <GrovePostActions
                  postId={post.id}
                  title={post.title}
                  initialHeartsCount={post.hearts_count}
                  initialHasReacted={reactedIds.has(post.id)}
                  signedIn={!!user}
                />
              </article>
            ))}
          </div>
        )}
      </main>
    </AppShell>
  );
}
