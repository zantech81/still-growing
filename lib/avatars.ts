// Placeholder set only: temporary colored-circle-plus-emoji stand-ins
// for the real illustrated avatar set (badge medals, flag-style icons,
// baby+tree art) the design calls for, which doesn't exist yet -- a
// design/production dependency, not something buildable here. Swapping
// in real art later only needs components/Avatar.tsx's rendering
// changed to reference real asset files; the data model (avatar_key
// values, this list, the users.avatar_key column) stays exactly the
// same, so nothing downstream needs to change when the art arrives.
//
// Colors are the same ones already established elsewhere in this app
// (tailwind.config.ts's named palette, plus the one supplementary
// saturated green GrowingTree.tsx/lib/og/renderShareImage.tsx already
// introduced for their own grass patch) rather than new ones invented
// for this feature -- the pale background tints (cream, pink-pale,
// blue-soft, green-soft) are deliberately excluded here since they read
// as washed-out for a small avatar circle.
export type AvatarOption = {
  key: string;
  label: string;
  color: string;
  emoji: string;
};

export const AVATARS: AvatarOption[] = [
  { key: "sprout", label: "Sprout", color: "#5EA83F", emoji: "🌱" },
  { key: "blossom", label: "Blossom", color: "#C76A8A", emoji: "🌸" },
  { key: "sunrise", label: "Sunrise", color: "#E5B94E", emoji: "☀️" },
  { key: "dusk", label: "Dusk", color: "#E8A0B8", emoji: "🌙" },
  { key: "plum", label: "Plum", color: "#4A2C3D", emoji: "⭐" },
  { key: "ink", label: "Ink", color: "#3A3A3A", emoji: "🌊" },
];

export const AVATAR_MAP: Map<string, AvatarOption> = new Map(AVATARS.map((a) => [a.key, a]));
