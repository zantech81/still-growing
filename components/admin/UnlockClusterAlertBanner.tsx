import Link from "next/link";

type Cluster = {
  id: string;
  title: string;
  unverifiedCount: number;
};

// Admin-only internal signal -- the opposite of components/AnnouncementBanner.tsx
// (that one is reader-facing and broadcasts to every visitor; this one
// should only ever be seen by an admin loading /admin). Deliberately
// styled nothing like it -- solid dark card with a marigold accent bar,
// not the soft pink dismissible top bar -- so the two are never confused
// for one another at a glance. No dismiss state: this is purely a live
// read of lib/unlockAlerts.ts's current trailing-24h count against
// site_settings.unlock_alert_threshold, recomputed fresh on every page
// load, so it clears itself the moment the count drops back under
// threshold -- nothing to persist or reset.
export default function UnlockClusterAlertBanner({
  clusters,
  threshold,
}: {
  clusters: Cluster[];
  threshold: number;
}) {
  if (clusters.length === 0) return null;

  return (
    <div className="bg-plum text-cream rounded-xl2 border-l-4 border-marigold p-5 mb-10">
      <p className="text-xs uppercase tracking-widest text-marigold-soft mb-2">
        Unusual unlock activity
      </p>
      <ul className="space-y-1.5">
        {clusters.map((c) => (
          <li key={c.id} className="text-sm flex items-center justify-between gap-4">
            <span>
              <strong>{c.title}</strong>: {c.unverifiedCount} unverified unlocks in the last 24h
              (threshold {threshold})
            </span>
            <Link href={`/admin/books/${c.id}`} className="text-marigold-soft hover:underline flex-shrink-0">
              Review →
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
