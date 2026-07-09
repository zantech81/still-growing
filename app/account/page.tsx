import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import NavBar from "@/components/NavBar";
import AccountForm from "@/components/AccountForm";

export default async function AccountPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/account");

  const { data: profile } = await supabase
    .from("users")
    .select("display_name, country_code")
    .eq("id", user.id)
    .single();

  return (
    <>
      <NavBar />
      <main className="max-w-lg mx-auto px-6 py-12">
        <h1 className="text-3xl mb-10">Account</h1>
        <AccountForm
          displayName={profile?.display_name ?? ""}
          countryCode={profile?.country_code ?? null}
        />
      </main>
    </>
  );
}
