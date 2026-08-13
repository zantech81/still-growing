import { generateTreeGeometry, hashSeed, VIEWBOX, LEAF_DISPLAY_CAP, TRUNK_BASE_X, TRUNK_BASE_Y } from "@/lib/growingTree";
import { AVATAR_MAP } from "@/lib/avatars";

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
              }}
            >
              {/* A raw "✓" character here previously rendered as a missing-
                  glyph tofu box: Satori has no system-font fallback, and
                  that glyph isn't in the Nunito webfont subset loaded for
                  this image. Two <line> segments instead, the same
                  primitive already proven safe in growingTreeCardTree
                  below, sidesteps font-coverage entirely. */}
              {filled && (
                <svg width="32" height="32" viewBox="0 0 24 24">
                  <line x1="4" y1="12.5" x2="9.5" y2="18" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
                  <line x1="9.5" y1="18" x2="20" y2="5.5" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
                </svg>
              )}
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
  milestoneLabel,
  shareUrl,
}: {
  text: string;
  authorName: string;
  chapterNumber: number;
  milestoneLabel: string | null;
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
        <div
          style={{
            display: "flex",
            fontFamily: "Nunito",
            fontSize: 22,
            color: COLORS.pinkDeep,
            textAlign: "center",
          }}
        >
          {authorName} · {milestoneLabel ? `${milestoneLabel} · ` : ""}Ch. {chapterNumber}
        </div>
      </div>

      <Branding shareUrl={shareUrl} />
    </div>
  );
}

// Same three-tier fallback as components/Avatar.tsx (avatar_key -> country
// flag -> initials), reimplemented here rather than imported: Avatar.tsx
// renders Tailwind classNames, which Satori can't resolve (it only
// understands inline styles, same reason every other card in this file
// hand-writes style objects instead of using the app's own Tailwind
// components). The underlying data -- AVATAR_MAP, the flagcdn URL pattern
// -- is still reused, only the JSX/rendering approach differs.
function OgAvatar({
  avatarKey,
  countryCode,
  avatarColor,
  name,
  size,
}: {
  avatarKey: string | null;
  countryCode: string | null;
  avatarColor: string;
  name: string;
  size: number;
}) {
  const avatar = avatarKey ? AVATAR_MAP.get(avatarKey) : null;

  if (avatar) {
    return (
      <div
        style={{
          display: "flex",
          width: size,
          height: size,
          borderRadius: 999,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: avatar.color,
          fontSize: size * 0.55,
        }}
      >
        {avatar.emoji}
      </div>
    );
  }

  if (countryCode) {
    return (
      <div
        style={{
          display: "flex",
          width: size,
          height: size,
          borderRadius: 999,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#F3F3F3",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`https://flagcdn.com/48x36/${countryCode.toLowerCase()}.png`}
          width={Math.round(size * 0.5)}
          height={Math.round(size * 0.375)}
        />
      </div>
    );
  }

  const initial = (name[0] ?? "?").toUpperCase();
  return (
    <div
      style={{
        display: "flex",
        width: size,
        height: size,
        borderRadius: 999,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: avatarColor,
        color: "#ffffff",
        fontFamily: "Nunito",
        fontWeight: 700,
        fontSize: size * 0.44,
      }}
    >
      {initial}
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

// The profile page's own share card (app/api/og/profile/[userId]/route.ts).
// Unlike the four types above, this doesn't correspond to a shares-table
// row or a point-in-time snapshot -- /u/[userId] is already a stable,
// permanent URL that always shows current data, so this image is
// generated fresh on every fetch from live data, not a moment captured at
// share-time. Reuses the same tree-drawing primitives as
// growingTreeCardTree (just at a smaller size) and the OgAvatar fallback
// chain above, rather than building either from scratch.
export function profileCardTree({
  name,
  avatarKey,
  countryCode,
  avatarColor,
  connectionCount,
  totalBadges,
  bookCount,
  bookTitle,
  seed,
  shareUrl,
}: {
  name: string;
  avatarKey: string | null;
  countryCode: string | null;
  avatarColor: string;
  connectionCount: number;
  totalBadges: number;
  bookCount: number;
  bookTitle: string;
  seed: string;
  shareUrl: string;
}) {
  const geometry = generateTreeGeometry(hashSeed(seed));
  const overflowing = connectionCount > LEAF_DISPLAY_CAP;
  const visibleLeafCount = Math.min(connectionCount, LEAF_DISPLAY_CAP);
  const treeHeight = 250;
  const treeWidth = Math.round((treeHeight * 400) / 420);

  const badgeSummary =
    totalBadges === 0
      ? bookTitle
      : bookCount > 1
      ? `${totalBadges} badges across ${bookCount} books`
      : `${totalBadges} ${totalBadges === 1 ? "badge" : "badges"} earned`;

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
        padding: "44px 80px 36px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
        <OgAvatar avatarKey={avatarKey} countryCode={countryCode} avatarColor={avatarColor} name={name} size={110} />
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", fontFamily: "Playfair Display", fontWeight: 700, fontSize: 48, color: COLORS.plum }}>
            {name}
          </div>
          <div style={{ display: "flex", fontFamily: "Nunito", fontSize: 24, color: COLORS.pinkDeep }}>
            {badgeSummary}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
        <svg width={treeWidth} height={treeHeight} viewBox={VIEWBOX}>
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
        <div style={{ display: "flex", fontFamily: "Nunito", fontSize: 22, color: COLORS.ink, textAlign: "center" }}>
          {connectionCount === 0
            ? `${name} is just getting started`
            : connectionCount === 1
            ? `1 person rooting for ${name}'s growth`
            : `${connectionCount} people rooting for ${name}'s growth`}
        </div>
      </div>

      <Branding shareUrl={shareUrl} />
    </div>
  );
}
