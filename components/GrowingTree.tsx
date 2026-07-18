import { generateTreeGeometry, hashSeed, VIEWBOX, LEAF_DISPLAY_CAP, TRUNK_BASE_X, TRUNK_BASE_Y } from "@/lib/growingTree";

// Same palette as the rest of the app (tailwind.config.ts / lib/og/renderShareImage.tsx),
// used as hex here since SVG fill/stroke attributes don't take Tailwind classes.
const COLORS = {
  plum: "#4A2C3D",
  pinkDusty: "#E8A0B8",
  pinkDeep: "#C76A8A",
  pinkPale: "#F7E1E9",
  greenSoft: "#EAF3DE",
  gold: "#E5B94E",
};
const LEAF_COLORS = [COLORS.pinkDusty, COLORS.gold, COLORS.greenSoft, COLORS.pinkPale];
// Deliberately not COLORS.greenSoft (that pale mint is for leaves): the
// grass patch reads as fresh lawn/grass, a saturated color, not another
// pastel tint.
const GRASS_GREEN = "#5EA83F";

type Props = {
  // Any stable per-user string works; the page passes the user's own id
  // so the same person's tree renders identically on every visit.
  seed: string;
  connectionCount: number;
  className?: string;
};

export default function GrowingTree({ seed, connectionCount, className }: Props) {
  const geometry = generateTreeGeometry(hashSeed(seed));
  const overflowing = connectionCount > LEAF_DISPLAY_CAP;
  const visibleLeafCount = Math.min(connectionCount, LEAF_DISPLAY_CAP);

  return (
    <div className={`relative ${className ?? ""}`}>
      <svg viewBox={VIEWBOX} className="w-full" role="img" aria-label={`A tree with ${connectionCount} people rooting for your growth`}>
        {/* A small patch of grass the tree grows from -- drawn first so
            the trunk's line renders on top of it, reading as "emerging
            from" the ground rather than floating over it. Fixed at the
            trunk's base, not part of the seeded/procedural geometry. */}
        <ellipse cx={TRUNK_BASE_X} cy={TRUNK_BASE_Y + 3} rx={48} ry={11} fill={GRASS_GREEN} opacity={0.9} />

        {geometry.branches.map((b, i) => (
          <line
            key={i}
            x1={b.x1}
            y1={b.y1}
            x2={b.x2}
            y2={b.y2}
            stroke={COLORS.plum}
            strokeWidth={b.strokeWidth}
            strokeLinecap="round"
            opacity={0.85}
          />
        ))}

        {overflowing ? (
          <>
            {geometry.canopyFiller.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r={4 + (i % 3)} fill={LEAF_COLORS[i % LEAF_COLORS.length]} opacity={0.75} />
            ))}
            {geometry.leafTips.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r={geometry.leafRadii[i] * 0.8} fill={LEAF_COLORS[i % LEAF_COLORS.length]} opacity={0.8} />
            ))}
          </>
        ) : (
          Array.from({ length: visibleLeafCount }, (_, i) => (
            <circle
              key={i}
              cx={geometry.leafTips[i].x}
              cy={geometry.leafTips[i].y}
              r={geometry.leafRadii[i]}
              fill={LEAF_COLORS[i % LEAF_COLORS.length]}
            />
          ))
        )}
      </svg>

      {/* Rendered as normal HTML rather than an in-SVG <text>, since a
          fixed SVG coordinate space doesn't reflow for arbitrary-length
          count text (an earlier version hardcoded font-size/position
          inside the viewBox and clipped both edges of longer counts,
          e.g. "25 people..." rendered as "5 people... grow"). This wraps
          and scales correctly at any width or count length instead. */}
      {overflowing && (
        <p className="absolute inset-x-0 top-[12%] text-center px-4 font-display font-bold text-plum text-base sm:text-lg leading-snug">
          {connectionCount} people rooting for your growth
        </p>
      )}
    </div>
  );
}
