import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/AppShell";
import AccountForm from "@/components/AccountForm";
import SignOutButton from "@/components/SignOutButton";

export default async function AccountPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/account");

  const { data: profile } = await supabase
    .from("users")
    .select("display_name, country_code, nickname, birth_month, birth_day")
    .eq("id", user.id)
    .single();

  return (
    <AppShell requireNickname={false}>
      <main className="max-w-lg mx-auto px-5 py-8">
        <h1 className="text-3xl mb-10">Account</h1>
        <AccountForm
          displayName={profile?.display_name ?? ""}
          countryCode={profile?.country_code ?? null}
          nickname={profile?.nickname ?? null}
          birthMonth={profile?.birth_month ?? null}
          birthDay={profile?.birth_day ?? null}
        />
        <div className="mt-12 pt-8 border-t border-pink-pale">
          <SignOutButton />
        </div>
      </main>
    </AppShell>
  );
}
