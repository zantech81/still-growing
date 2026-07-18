// Deterministic procedural tree geometry for the Growing page. Pure data
// generation only (no JSX/rendering here) so both the live in-app SVG
// component (components/GrowingTree.tsx) and, if it turns out to be
// needed, a separate satori-compatible renderer for the shareable OG
// image can reuse the exact same seeded structure without duplicating
// the branching math.

export type Point = { x: number; y: number };
export type BranchLine = { x1: number; y1: number; x2: number; y2: number; strokeWidth: number };

export type TreeGeometry = {
  branches: BranchLine[];
  // Fixed-length, seed-only-dependent, DFS-traversal-ordered tip
  // positions. A person's leaf is always leafTips[N] where N is their
  // rank by connection created_at (see app/growing/page.tsx) -- since
  // this array's order never changes for a given seed, an existing
  // connection's leaf never moves as new ones are added; new leaves
  // simply reveal the next position in this already-fixed sequence.
  leafTips: Point[];
  leafRadii: number[]; // aligned 1:1 with leafTips
  // Extra scattered points (not tied to any specific person) used only
  // for the "denser canopy" overflow look once the real count exceeds
  // LEAF_DISPLAY_CAP -- see components/GrowingTree.tsx.
  canopyFiller: Point[];
};

const VIEWBOX_WIDTH = 400;
const VIEWBOX_HEIGHT = 420;
const BRANCH_DEPTH = 5; // 2^5 = 32 tips, comfortably above LEAF_DISPLAY_CAP

export const VIEWBOX = `0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`;
export const LEAF_DISPLAY_CAP = 20;
// Exported (not just a local constant) so the grass patch drawn at the
// trunk's base -- a fixed cosmetic detail, not part of the seeded/
// procedural geometry -- can be positioned identically by both renderers
// (components/GrowingTree.tsx and lib/og/renderShareImage.tsx) without
// hardcoding the same two numbers twice.
export const TRUNK_BASE_X = 200;
export const TRUNK_BASE_Y = 400;

// Simple string hash (not cryptographic, doesn't need to be) so a
// user_id UUID feeds a stable 32-bit seed. Same input always produces
// the same seed, which is the only property that matters here.
export function hashSeed(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (Math.imul(hash, 31) + input.charCodeAt(i)) | 0;
  }
  return hash >>> 0;
}

// mulberry32: small, fast, deterministic PRNG. Same seed -> same
// sequence forever, which is the entire point (a person's tree looks
// identical across visits and devices).
function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// How many branch-splits deep to group tips by, for spreading leaf order
// across the whole canopy (see below). 2^GROUP_LEVELS groups, each with
// 2^(BRANCH_DEPTH-GROUP_LEVELS) tips.
const GROUP_LEVELS = 3;

export function generateTreeGeometry(seed: number): TreeGeometry {
  const rand = mulberry32(seed);
  const branches: BranchLine[] = [];
  const rawTips: (Point & { group: number })[] = [];

  function branch(
    x: number,
    y: number,
    angle: number,
    length: number,
    depth: number,
    strokeWidth: number,
    level: number,
    group: number
  ) {
    const endX = x + length * Math.cos(angle);
    const endY = y - length * Math.sin(angle);
    branches.push({ x1: x, y1: y, x2: endX, y2: endY, strokeWidth });

    if (depth <= 0) {
      rawTips.push({ x: endX, y: endY, group });
      return;
    }

    const jitter = (rand() - 0.5) * 0.5;
    const decay = 0.66 + rand() * 0.12;
    const spread = 0.55 + rand() * 0.35;
    // Only the first GROUP_LEVELS branch-splits refine the group id, so
    // every tip below that point inherits its ancestor's group rather
    // than getting its own -- that's what keeps the group count at
    // 2^GROUP_LEVELS instead of one group per tip.
    const leftGroup = level < GROUP_LEVELS ? group * 2 : group;
    const rightGroup = level < GROUP_LEVELS ? group * 2 + 1 : group;
    branch(endX, endY, angle - spread / 2 + jitter, length * decay, depth - 1, strokeWidth * 0.68, level + 1, leftGroup);
    branch(endX, endY, angle + spread / 2 + jitter, length * decay, depth - 1, strokeWidth * 0.68, level + 1, rightGroup);
  }

  branch(TRUNK_BASE_X, TRUNK_BASE_Y, Math.PI / 2, 95, BRANCH_DEPTH, 11, 0, 0);

  // Raw DFS order visits one whole branch's subtree before moving to the
  // next, so the earliest tips would otherwise all cluster in one corner
  // of the tree instead of spreading out -- the opposite of what a
  // growing canopy should look like. Interleaving round-robin across the
  // 2^GROUP_LEVELS groups (one tip from each branch region per round)
  // means the Nth connection's leaf lands in a new region of the canopy
  // rather than piling onto the same corner as connection N-1. Still a
  // pure function of the seed, so still perfectly stable across renders.
  const groups: Point[][] = Array.from({ length: 1 << GROUP_LEVELS }, () => []);
  for (const tip of rawTips) groups[tip.group].push({ x: tip.x, y: tip.y });

  const leafTips: Point[] = [];
  const maxGroupSize = Math.max(...groups.map((g) => g.length));
  for (let round = 0; round < maxGroupSize; round++) {
    for (const g of groups) {
      if (g[round]) leafTips.push(g[round]);
    }
  }

  // Radii drawn in this same final interleaved order right after, so
  // they stay paired (leafRadii[i] is always leafTips[i]'s size) while
  // still being a deterministic function of the seed alone.
  const leafRadii = leafTips.map(() => 7 + rand() * 4);

  const xs = leafTips.map((p) => p.x);
  const ys = leafTips.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const canopyFiller: Point[] = Array.from({ length: 46 }, () => ({
    x: minX + rand() * (maxX - minX),
    y: minY + rand() * (maxY - minY) * 1.15,
  }));

  return { branches, leafTips, leafRadii, canopyFiller };
}
