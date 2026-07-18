import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function AdminDashboard() {
  const supabase = createClient();

  const [
    { count: memberCount },
    { data: books },
    { count: reflectionCount },
    { count: reactionCount },
  ] = await Promise.all([
    supabase.from("users").select("*", { count: "exact", head: true }),
    supabase.from("books").select("id, title, status"),
    supabase.from("reflections").select("*", { count: "exact", head: true }).eq("is_hidden", false),
    supabase.from("reactions").select("*", { count: "exact", head: true }),
  ]);

  const booksByStatus = (books ?? []).reduce<Record<string, number>>(
    (acc, b) => ({ ...acc, [b.status]: (acc[b.status] ?? 0) + 1 }),
    {}
  );

  const stats = [
    { label: "Members", value: memberCount ?? 0 },
    { label: "Reflections shared", value: reflectionCount ?? 0 },
    { label: "Reactions", value: reactionCount ?? 0 },
    { label: "Books", value: books?.length ?? 0 },
  ];

  return (
    <div>
      <h1 className="text-3xl font-display text-plum mb-8">Dashboard</h1>

      <div className="grid grid-cols-2 gap-4 mb-10 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-white border border-pink-pale rounded-xl2 p-5">
            <p className="text-3xl font-display text-plum mb-1">{s.value}</p>
            <p className="text-xs text-gray-400 uppercase tracking-widest">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <QuickLink href="/admin/books" title="Books" description="Create and publish books, manage chapters and badges." />
        <QuickLink href="/admin/members" title="Members" description="See who has joined and their progress." />
        <QuickLink href="/admin/circle" title="Circle" description="Moderate reader reflections." />
      </div>

      {(booksByStatus.draft ?? 0) > 0 && (
        <p className="mt-8 text-sm text-gray-400">
          {booksByStatus.draft} draft book{booksByStatus.draft === 1 ? "" : "s"}, <Link href="/admin/books" className="text-pink-deep hover:underline">publish when ready</Link>
        </p>
      )}
    </div>
  );
}

function QuickLink({ href, title, description }: { href: string; title: string; description: string }) {
  return (
    <Link href={href} className="block bg-white border border-pink-pale hover:border-pink-dusty rounded-xl2 p-5 transition-colors">
      <p className="font-medium text-plum mb-1">{title}</p>
      <p className="text-sm text-gray-400">{description}</p>
    </Link>
  );
}
