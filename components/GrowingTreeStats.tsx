import FlagImg from "@/components/FlagImg";
import type { GrowingTreeExtra } from "@/lib/connections";

// Shared rendering for the "Growing since [date] · N countries rooting
// for {name}'s growth" line + flag/country grid, used by both
// app/r/[shareId]/page.tsx (the growing_tree share card) and
// app/u/[userId]/page.tsx (the profile page's tree section), so the two
// stay visually identical rather than drifting apart as two separate
// copies of the same JSX. Owns its own conditional wrapper (renders
// nothing at all, not even an empty padded box, when a brand-new
// grower has no connections/countries yet) so callers don't need to
// duplicate that check themselves -- className applies to that wrapper,
// letting each caller supply its own spacing/padding.
export default function GrowingTreeStats({ extra, className }: { extra: GrowingTreeExtra; className?: string }) {
  const hasStatsLine = extra.growingSince || extra.totalCountryCount > 0;
  const hasCountryGrid = extra.visibleCountries.length > 0;
  if (!hasStatsLine && !hasCountryGrid) return null;

  return (
    <div className={className}>
      {hasStatsLine && (
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-1 text-xs text-gray-400">
          {extra.growingSince && <span>Growing since {extra.growingSince}</span>}
          {extra.totalCountryCount > 0 && (
            <span>
              {extra.totalCountryCount} {extra.totalCountryCount === 1 ? "country" : "countries"} rooting for{" "}
              {extra.ownerName}&apos;s growth
            </span>
          )}
        </div>
      )}

      {hasCountryGrid && (
        <div className="grid grid-cols-3 gap-x-3 gap-y-2 justify-items-center mt-4 max-w-sm mx-auto text-sm text-ink">
          {extra.visibleCountries.map(({ code, count, name }) => (
            <span key={code} className="flex items-center gap-1.5">
              <FlagImg code={code} className="rounded-sm" />
              {name} · {count}
            </span>
          ))}
          {extra.hiddenCountryCount > 0 && (
            <span className="col-span-3 text-gray-400">+{extra.hiddenCountryCount} more countries</span>
          )}
        </div>
      )}
    </div>
  );
}
