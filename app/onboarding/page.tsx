import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import OnboardingForm from "@/components/OnboardingForm";

export default async function OnboardingPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/onboarding");

  // If already has a nickname, skip this page
  const { data: profile } = await supabase
    .from("users")
    .select("nickname, avatar_color, is_admin")
    .eq("id", user.id)
    .single();

  if (profile?.nickname) redirect("/library");

  return (
    <div className="min-h-screen flex items-start justify-center px-5 py-16">
      <div className="w-full max-w-md">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/logo-page-header.png" alt="Still Growing" className="h-10 w-auto mb-6" />
        <h1 className="font-display text-4xl text-plum mb-2">Before we begin</h1>
        <p className="text-gray-400 mb-10 text-sm">
          Choose a nickname for the Circle, the space where readers share reflections.
        </p>
        <OnboardingForm
          avatarColor={profile?.avatar_color ?? "#E8A0B8"}
          isAdmin={profile?.is_admin ?? false}
        />
      </div>
    </div>
  );
}
