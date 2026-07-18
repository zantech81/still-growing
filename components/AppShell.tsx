import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppNav from "./AppNav";
import BirthdayBanner from "./BirthdayBanner";

type Props = {
  children: React.ReactNode;
  requireNickname?: boolean;
};

export default async function AppShell({ children, requireNickname = true }: Props) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <div className="pt-14">{children}</div>;
  }

  const [{ data: profile }, { count: unreadCount }, { data: firstBook }, { count: unlockedBookCount }] =
    await Promise.all([
      supabase
        .from("users")
        .select("display_name, nickname, avatar_color, is_admin, birth_month, birth_day")
        .eq("id", user.id)
        .single(),
      supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false),
      supabase
        .from("user_books")
        .select("books(slug)")
        .eq("user_id", user.id)
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("book_unlocks")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id),
    ]);

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
  const initial = displayName[0].toUpperCase();
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
        initial={initial}
        avatarColor={avatarColor}
        hasUnread={hasUnread}
        journeyHref={journeyHref}
        isAdmin={isAdmin}
        currentUserId={user.id}
      />
      {/* pt-14 clears the fixed 56px header; pb-20 clears the 64px mobile bottom nav */}
      <div className="min-h-screen pt-14 pb-20 md:pb-4">
        {showBirthday && <BirthdayBanner name={birthdayName} />}
        {children}
      </div>
    </>
  );
}
