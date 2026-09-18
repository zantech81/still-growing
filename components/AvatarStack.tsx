import { createClient } from "@/lib/supabase/server";
import Avatar from "@/components/Avatar";

const SAMPLE_SIZE = 5;

// Real social proof, not decoration: a small sample of real members'
// avatars (via public_profiles -- anon-readable, safe-column-only view,
// see 0033/0039 migrations) alongside the real sitewide badge count (a
// straight count(*) on user_badges, the actual earned-badge join table --
// chosen over summing user_books.badges_earned since it's ground truth
// rather than a denormalized counter that could drift, and over a raw
// member count since it pairs with the hero's "badges" narrative). Both
// queries are anon-safe, so this renders identically for signed-out cold
// traffic and signed-in readers.
export default async function AvatarStack({ className }: { className?: string }) {
  const supabase = createClient();
  const [{ data: profiles }, { count: badgesClaimed }] = await Promise.all([
    supabase
      .from("public_profiles")
      .select("id, nickname, display_name, avatar_color, avatar_key, country_code")
      .not("avatar_key", "is", null)
      .order("id")
      .limit(SAMPLE_SIZE),
    supabase.from("user_badges").select("id", { count: "exact", head: true }),
  ]);

  const count = badgesClaimed ?? 0;
  if (!profiles?.length || count === 0) return null;

  return (
    <div className={`flex items-center gap-3 ${className ?? ""}`}>
      <div className="flex -space-x-3">
        {profiles.map((p) => (
          <Avatar
            key={p.id}
            avatarKey={p.avatar_key}
            countryCode={p.country_code}
            avatarColor={p.avatar_color ?? "#E8A0B8"}
            name={p.nickname ?? p.display_name ?? "?"}
            size={36}
            className="ring-2 ring-cream"
          />
        ))}
      </div>
      <p className="text-sm text-ink">
        <span className="font-semibold text-pink-deep">{count.toLocaleString()}</span>{" "}
        {count === 1 ? "badge" : "badges"} claimed by readers growing with you
      </p>
    </div>
  );
}
