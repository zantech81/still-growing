import { redirect } from "next/navigation";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import AppNav from "./AppNav";
import BirthdayBanner from "./BirthdayBanner";
import AnnouncementBanner from "./AnnouncementBanner";

export type AppShellData = {
  profile: {
    display_name: string | null;
    nickname: string | null;
    avatar_color: string | null;
    avatar_key: string | null;
    country_code: string | null;
    is_admin: boolean | null;
    birth_month: number | null;
    birth_day: number | null;
  } | null;
  unreadCount: number | null;
  firstBook: { books: { slug: string } | { slug: string }[] | null } | null;
  unlockedBookCount: number | null;
  announcement: {
    announcement_active: boolean;
    announcement_message: string | null;
    announcement_link: string | null;
  } | null;
};

// Split out so a page that already knows `user` (nearly every route --
// they call getUser() themselves for their own queries) can kick this off
// alongside its own data fetching instead of leaving AppShell to start it
// only after the page's own await chain finishes. Before this, every nav
// was a strict waterfall: page's getUser() -> page's own queries ->
// AppShell's getUser() -> AppShell's queries, all in series -- confirmed
// as a real contributor to both the "every tab nav feels slow" perception
// issue and the ~5s post-login gap (2026-08-27 investigation). Pass
// `user` + `dataPromise` (see Props below) to overlap this with the
// page's own fetch instead; omit both to keep the old self-fetching
// behavior (used by routes not yet updated to the parallel pattern).
export async function fetchAppShellData(supabase: SupabaseClient, userId: string): Promise<AppShellData> {
  const [{ data: profile }, { count: unreadCount }, { data: firstBook }, { count: unlockedBookCount }, { data: announcement }] =
    await Promise.all([
      supabase
        .from("users")
        .select("display_name, nickname, avatar_color, avatar_key, country_code, is_admin, birth_month, birth_day")
        .eq("id", userId)
        .single(),
      supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("is_read", false),
      supabase
        .from("user_books")
        .select("books(slug)")
        .eq("user_id", userId)
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("book_unlocks")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId),
      supabase
        .from("site_settings")
        .select("announcement_active, announcement_message, announcement_link")
        .eq("id", 1)
        .maybeSingle(),
    ]);

  return { profile, unreadCount, firstBook, unlockedBookCount, announcement };
}

type Props = {
  children: React.ReactNode;
  requireNickname?: boolean;
  user?: User | null;
  dataPromise?: Promise<AppShellData>;
};

export default async function AppShell({ children, requireNickname = true, user: userProp, dataPromise }: Props) {
  const supabase = createClient();

  let user = userProp;
  if (user === undefined) {
    const {
      data: { user: fetchedUser },
    } = await supabase.auth.getUser();
    user = fetchedUser;
  }

  if (!user) {
    return <div className="pt-14">{children}</div>;
  }

  const { profile, unreadCount, firstBook, unlockedBookCount, announcement } = dataPromise
    ? await dataPromise
    : await fetchAppShellData(supabase, user.id);

  if (requireNickname && !profile?.nickname) {
    redirect("/onboarding");
  }

  const bookSlug = (() => {
    const b = firstBook?.books;
    if (!b) return null;
    return Array.isArray(b) ? (b[0] as { slug: string })?.slug : (b as { slug: string }).slug;
  })();

  // With 2+ unlocked books, Journey goes through a switcher first
  // (app/journey/page.tsx) instead of assuming which book. With 0 or 1
  // (today's reality: exactly one published book), this is exactly the
  // same computation as before -- untouched, including its existing
  // "no user_books row yet" fallback to /library -- so nothing changes
  // for any current user.
  const journeyHref = (unlockedBookCount ?? 0) >= 2 ? "/journey" : bookSlug ? `/${bookSlug}` : "/library";
  const displayName = profile?.nickname ?? profile?.display_name ?? user.email ?? "?";
  const avatarColor = profile?.avatar_color ?? "#E8A0B8";
  const hasUnread = (unreadCount ?? 0) > 0;
  const isAdmin = profile?.is_admin ?? false;

  const today = new Date();
  const showBirthday =
    !!profile?.birth_month &&
    !!profile?.birth_day &&
    profile.birth_month === today.getMonth() + 1 &&
    profile.birth_day === today.getDate();

  const birthdayName = profile?.nickname ?? profile?.display_name ?? "friend";

  return (
    <>
      <AppNav
        name={displayName}
        avatarKey={profile?.avatar_key ?? null}
        countryCode={profile?.country_code ?? null}
        avatarColor={avatarColor}
        hasUnread={hasUnread}
        journeyHref={journeyHref}
        isAdmin={isAdmin}
        currentUserId={user.id}
      />
      {/* pt-14 clears the fixed 56px header; pb-20 clears the 64px mobile bottom nav */}
      <div className="min-h-screen pt-14 pb-20 md:pb-4">
        {announcement?.announcement_active && announcement.announcement_message && (
          <AnnouncementBanner
            message={announcement.announcement_message}
            link={announcement.announcement_link}
          />
        )}
        {showBirthday && <BirthdayBanner name={birthdayName} />}
        {children}
      </div>
    </>
  );
}
