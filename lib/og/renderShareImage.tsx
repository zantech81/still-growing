import { generateTreeGeometry, hashSeed, VIEWBOX, LEAF_DISPLAY_CAP, TRUNK_BASE_X, TRUNK_BASE_Y } from "@/lib/growingTree";

// Satori/ImageResponse JSX for the four share-image formats. Kept
// separate from the route handlers so both the public share route
// (app/api/og/[type]/[shareId]/route.ts) and anything else that needs the
// exact same visuals can reuse it without duplicating markup.
//
// Colors pulled directly from tailwind.config.ts so these read as the same
// visual language as the rest of the app, not a reinvented palette.
const COLORS = {
  cream: "#FBF7F2",
  pinkDusty: "#E8A0B8",
  pinkDeep: "#C76A8A",
  pinkPale: "#F7E1E9",
  blueSoft: "#E6F1FB",
  greenSoft: "#EAF3DE",
  gold: "#E5B94E",
  plum: "#4A2C3D",
  ink: "#3A3A3A",
};

const WIDTH = 1200;
const HEIGHT = 630;

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 1).trimEnd() + "…";
}

// "One line from its description" reads far more naturally as the first
// full sentence than as an arbitrary character-count cut mid-word.
function firstSentence(text: string, max: number): string {
  const match = text.match(/^[^.!?]*[.!?]/);
  const sentence = match ? match[0].trim() : text;
  return truncate(sentence, max);
}

function Branding({ shareUrl }: { shareUrl: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <div
        style={{
          fontFamily: "Nunito",
          fontWeight: 700,
          fontSize: 22,
          color: COLORS.pinkDeep,
          letterSpacing: 2,
          textTransform: "uppercase",
        }}
      >
        Still Growing
      </div>
      <div
        style={{
          display: "flex",
          fontFamily: "Nunito",
          fontSize: 20,
          color: COLORS.pinkDeep,
          padding: "6px 18px",
          borderRadius: 999,
          backgroundColor: COLORS.pinkPale,
        }}
      >
        {shareUrl}
      </div>
    </div>
  );
}

export function badgeCardTree({
  badgeName,
  badgeDescription,
  badgeImageUrl,
  shareUrl,
}: {
  badgeName: string;
  badgeDescription: string | null;
  badgeImageUrl: string | null;
  shareUrl: string;
}) {
  return (
    <div
      style={{
        width: WIDTH,
        height: HEIGHT,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: COLORS.cream,
        padding: "48px 80px 56px",
      }}
    >
      <div
        style={{
          fontFamily: "Nunito",
          fontWeight: 700,
          fontSize: 20,
          color: COLORS.pinkDeep,
          letterSpacing: 3,
          textTransform: "uppercase",
        }}
      >
        Milestone Unlocked
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24 }}>
        {/* Fixed-height slot regardless of the source badge artwork's own
            internal padding/ribbon, so it can never crowd the label above it. */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: 200,
          }}
        >
          {badgeImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={badgeImageUrl} height={200} style={{ objectFit: "contain" }} />
          ) : (
            <div
              style={{
                width: 180,
                height: 180,
                borderRadius: 999,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 90,
                backgroundColor: COLORS.pinkPale,
              }}
            >
              🏅
            </div>
          )}
        </div>
        <div
          style={{
            fontFamily: "Playfair Display",
            fontWeight: 700,
            fontSize: 56,
            color: COLORS.plum,
            textAlign: "center",
          }}
        >
          {badgeName}
        </div>
        {badgeDescription && (
          <div
            style={{
              display: "flex",
              fontFamily: "Nunito",
              fontSize: 26,
              color: COLORS.ink,
              textAlign: "center",
              maxWidth: 820,
            }}
          >
            {firstSentence(badgeDescription, 160)}
          </div>
        )}
      </div>

      <Branding shareUrl={shareUrl} />
    </div>
  );
}

export function progressCardTree({
  bookTitle,
  badgesEarned,
  totalChapters,
  shareUrl,
}: {
  bookTitle: string;
  badgesEarned: number;
  totalChapters: number;
  shareUrl: string;
}) {
  const dots = Array.from({ length: totalChapters }, (_, i) => i < badgesEarned);

  return (
    <div
      style={{
        width: WIDTH,
        height: HEIGHT,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: COLORS.cream,
        padding: "56px 80px",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
        <div
          style={{
            fontFamily: "Nunito",
            fontWeight: 700,
            fontSize: 20,
            color: COLORS.pinkDeep,
            letterSpacing: 3,
            textTransform: "uppercase",
          }}
        >
          My Journey
        </div>
        <div style={{ fontFamily: "Playfair Display", fontWeight: 700, fontSize: 40, color: COLORS.plum }}>
          {bookTitle}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 28 }}>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: 18,
            maxWidth: 720,
          }}
        >
          {dots.map((filled, i) => (
            <div
              key={i}
              style={{
                width: 72,
                height: 72,
                borderRadius: 999,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: filled ? COLORS.gold : COLORS.cream,
                border: filled ? "none" : `4px solid ${COLORS.pinkPale}`,
                color: "#ffffff",
                fontSize: 28,
                fontWeight: 700,
                fontFamily: "Nunito",
              }}
            >
              {filled ? "✓" : ""}
            </div>
          ))}
        </div>
        <div
          style={{
            display: "flex",
            fontFamily: "Playfair Display",
            fontWeight: 700,
            fontSize: 44,
            color: COLORS.pinkDeep,
          }}
        >
          {badgesEarned} of {totalChapters} badges earned
        </div>
      </div>

      <Branding shareUrl={shareUrl} />
    </div>
  );
}

export function reflectionCardTree({
  text,
  authorName,
  chapterNumber,
  shareUrl,
}: {
  text: string;
  authorName: string;
  chapterNumber: number;
  shareUrl: string;
}) {
  return (
    <div
      style={{
        width: WIDTH,
        height: HEIGHT,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: COLORS.blueSoft,
        padding: "56px 80px",
      }}
    >
      <div
        style={{
          fontFamily: "Nunito",
          fontWeight: 700,
          fontSize: 20,
          color: COLORS.pinkDeep,
          letterSpacing: 3,
          textTransform: "uppercase",
        }}
      >
        From The Circle
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#ffffff",
          border: `2px solid ${COLORS.pinkPale}`,
          borderRadius: 32,
          padding: "48px 56px",
          maxWidth: 920,
          gap: 24,
        }}
      >
        <div
          style={{
            display: "flex",
            fontFamily: "Playfair Display",
            fontStyle: "italic" as const,
            fontSize: 34,
            lineHeight: 1.5,
            color: COLORS.ink,
            textAlign: "center",
          }}
        >
          &ldquo;{truncate(text, 220)}&rdquo;
        </div>
        <div style={{ display: "flex", fontFamily: "Nunito", fontSize: 22, color: COLORS.pinkDeep }}>
          {authorName} · Ch. {chapterNumber}
        </div>
      </div>

      <Branding shareUrl={shareUrl} />
    </div>
  );
}

const TREE_LEAF_COLORS = [COLORS.pinkDusty, COLORS.gold, COLORS.greenSoft, COLORS.pinkPale];
// Matches components/GrowingTree.tsx's GRASS_GREEN: deliberately not
// COLORS.greenSoft (that pale mint is for leaves), a saturated fresh-
// lawn green for the grass patch specifically.
const GRASS_GREEN = "#5EA83F";

// Reuses the exact same seeded geometry as the live in-app tree
// (components/GrowingTree.tsx) via lib/growingTree.ts, so a shared card
// shows the same tree shape the owner sees on their own Growing page,
// not a reinvented one. Verified directly against Satori (this file's
// JSX is rendered through next/og's ImageResponse, not a browser) before
// building this: raw <svg>/<line>/<circle> at this exact scale (60+
// branches, up to ~90 circles in the overflow/canopy case) render
// correctly, so no HTML-div fallback was needed here.
export function growingTreeCardTree({
  authorName,
  connectionCount,
  seed,
  shareUrl,
}: {
  authorName: string;
  connectionCount: number;
  seed: string;
  shareUrl: string;
}) {
  const geometry = generateTreeGeometry(hashSeed(seed));
  const overflowing = connectionCount > LEAF_DISPLAY_CAP;
  const visibleLeafCount = Math.min(connectionCount, LEAF_DISPLAY_CAP);

  return (
    <div
      style={{
        width: WIDTH,
        height: HEIGHT,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: COLORS.cream,
        padding: "48px 80px 40px",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
        <div
          style={{
            fontFamily: "Nunito",
            fontWeight: 700,
            fontSize: 20,
            color: COLORS.pinkDeep,
            letterSpacing: 3,
            textTransform: "uppercase",
          }}
        >
          My Growing Tree
        </div>
        <div
          style={{
            display: "flex",
            fontFamily: "Playfair Display",
            fontWeight: 700,
            fontSize: 34,
            color: COLORS.plum,
            textAlign: "center",
          }}
        >
          {connectionCount === 0
            ? `${authorName} is just getting started`
            : connectionCount === 1
            ? `1 person rooting for ${authorName}'s growth`
            : `${connectionCount} people rooting for ${authorName}'s growth`}
        </div>
      </div>

      <svg width={340} height={357} viewBox={VIEWBOX}>
        {/* Same grass patch as the live in-app tree
            (components/GrowingTree.tsx), drawn first so the trunk renders
            on top of it. Fixed at the trunk's base, not part of the
            seeded/procedural geometry. */}
        <ellipse cx={TRUNK_BASE_X} cy={TRUNK_BASE_Y + 3} rx={48} ry={11} fill={GRASS_GREEN} />

        {geometry.branches.map((b, i) => (
          <line
            key={`b${i}`}
            x1={b.x1}
            y1={b.y1}
            x2={b.x2}
            y2={b.y2}
            stroke={COLORS.plum}
            strokeWidth={b.strokeWidth}
            strokeLinecap="round"
          />
        ))}
        {overflowing
          ? [
              ...geometry.canopyFiller.map((p, i) => (
                <circle key={`f${i}`} cx={p.x} cy={p.y} r={4 + (i % 3)} fill={TREE_LEAF_COLORS[i % 4]} opacity={0.75} />
              )),
              ...geometry.leafTips.map((p, i) => (
                <circle
                  key={`t${i}`}
                  cx={p.x}
                  cy={p.y}
                  r={geometry.leafRadii[i] * 0.8}
                  fill={TREE_LEAF_COLORS[i % 4]}
                  opacity={0.8}
                />
              )),
            ]
          : Array.from({ length: visibleLeafCount }, (_, i) => (
              <circle
                key={`l${i}`}
                cx={geometry.leafTips[i].x}
                cy={geometry.leafTips[i].y}
                r={geometry.leafRadii[i]}
                fill={TREE_LEAF_COLORS[i % 4]}
              />
            ))}
      </svg>

      <Branding shareUrl={shareUrl} />
    </div>
  );
}
