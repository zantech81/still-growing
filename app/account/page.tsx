import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import AppShell, { fetchAppShellData } from "@/components/AppShell";
import AccountForm from "@/components/AccountForm";
import SignOutButton from "@/components/SignOutButton";

export default async function AccountPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/account");

  // Fired now, alongside this page's own query below, instead of left for
  // AppShell to fetch strictly after this function returns -- see the
  // comment on fetchAppShellData in components/AppShell.tsx.
  const appShellDataPromise = fetchAppShellData(supabase, user.id);

  const { data: profile } = await supabase
    .from("users")
    .select("display_name, country_code, nickname, birth_month, birth_day, avatar_key, avatar_color, is_admin")
    .eq("id", user.id)
    .single();

  return (
    <AppShell requireNickname={false} user={user} dataPromise={appShellDataPromise}>
      <main className="max-w-lg mx-auto px-5 py-8">
        <h1 className="text-3xl mb-10">Account</h1>
        <AccountForm
          userId={user.id}
          displayName={profile?.display_name ?? ""}
          countryCode={profile?.country_code ?? null}
          nickname={profile?.nickname ?? null}
          birthMonth={profile?.birth_month ?? null}
          birthDay={profile?.birth_day ?? null}
          avatarKey={profile?.avatar_key ?? null}
          avatarColor={profile?.avatar_color ?? "#E8A0B8"}
          isAdmin={profile?.is_admin ?? false}
        />
        <div className="mt-12 pt-8 border-t border-pink-pale">
          <Link
            href="/account/review"
            className="block bg-white border border-pink-pale hover:border-pink-dusty rounded-xl2 p-4 transition-colors mb-8"
          >
            <p className="font-medium text-plum mb-0.5">Leave a review</p>
            <p className="text-sm text-gray-400">
              Enjoying Still Growing? Share what it's meant to you.
            </p>
          </Link>
          <SignOutButton />
          <p className="text-center mt-6">
            <Link href="/privacy" className="text-xs text-gray-400 hover:text-ink transition-colors">
              Privacy Policy
            </Link>
          </p>
        </div>
      </main>
    </AppShell>
  );
}
