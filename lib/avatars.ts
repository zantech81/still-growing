// Real illustrated art (public/avatars/*.png) for every entry now,
// swapped in from what was originally a temporary colored-circle-plus-
// emoji placeholder set. `image` is optional on the type -- Avatar.tsx
// still falls back to emoji-on-color when it's absent -- but every
// option actually defined below carries one; that fallback exists as
// reasonable defensive code for a future avatar added before its art is
// ready, not because anything currently needs it. The original "plum"
// (⭐) and "ink" (🌊) NATURE_AVATARS entries were dropped entirely
// rather than kept as an emoji-only exception: no art was ever
// generated for them and no real user had picked either yet. The data
// model (avatar_key values, this list, the users.avatar_key column)
// never changed across the original emoji->art swap, so no migration
// was needed for existing users on the entries that DO still exist --
// their stored avatar_key still resolves to the same entry, which now
// happens to carry an `image`.
//
// Colors are the same ones already established elsewhere in this app
// (tailwind.config.ts's named palette, plus the one supplementary
// saturated green GrowingTree.tsx/lib/og/renderShareImage.tsx already
// introduced for their own grass patch) rather than new ones invented
// for this feature -- the pale background tints (cream, pink-pale,
// blue-soft, green-soft, and the newer leaf-soft/marigold-soft) are
// deliberately excluded here since they read as washed-out for a small
// avatar circle.
export type AvatarOption = {
  key: string;
  label: string;
  color: string;
  emoji: string;
  image?: string;
};

export const NATURE_AVATARS: AvatarOption[] = [
  { key: "sprout", label: "Sprout", color: "#5EA83F", emoji: "🌱", image: "/avatars/avatar-sprout.png" },
  { key: "blossom", label: "Blossom", color: "#C76A8A", emoji: "🌸", image: "/avatars/avatar-flower.png" },
  { key: "sunrise", label: "Sunrise", color: "#E5B94E", emoji: "☀️", image: "/avatars/avatar-sun.png" },
  { key: "dusk", label: "Dusk", color: "#E8A0B8", emoji: "🌙", image: "/avatars/avatar-moon-stars.png" },
];

// Baby-themed set, on-brand with "Life Lessons from a Baby": the 👶
// emoji across all 6 standard Unicode tones (the 5 Fitzpatrick
// skin-tone modifiers plus the default/yellow tone, tied to no
// specific ethnicity) -- now real illustrated art in the same light-to-
// dark order. Backgrounds are deliberately NOT drawn from the general
// palette above -- pulling arbitrary palette colors (including dark
// ones like plum/ink) is what caused a near-invisible dark-emoji-on-
// dark-background contrast bug back when this was emoji-only. Instead
// every baby avatar alternates between two dedicated light backgrounds
// (pink, baby blue) chosen for reliable contrast against every skin
// tone, light or dark -- still relevant now as a border/backdrop
// around the illustrated art, not just for emoji contrast.
const BABY_PINK = "#E8A0B8";
const BABY_BLUE = "#A9D6E8";

// File-number order (avatar-baby-1.png..6.png) does NOT match actual
// light-to-dark tone -- confirmed by sampling each image's forehead pixel
// color (avg RGB, ITU-R BT.601 luminance) rather than eyeballing it, since
// two pairs (1 vs 6, and 4 vs 5) read as close enough to misjudge by eye
// alone: measured lightest-to-darkest is 2 (203.6) > 1 (172.2) > 6 (161.8)
// > 3 (157.5) > 5 (114.3) > 4 (108.3). Mapped below by that measured order,
// not by filename number, so each key's actual tone matches its label.
export const BABY_AVATARS: AvatarOption[] = [
  { key: "baby-light", label: "Baby (Light)", color: BABY_PINK, emoji: "👶🏻", image: "/avatars/avatar-baby-2.png" },
  { key: "baby-medium-light", label: "Baby (Medium Light)", color: BABY_BLUE, emoji: "👶🏼", image: "/avatars/avatar-baby-1.png" },
  { key: "baby-medium", label: "Baby (Medium)", color: BABY_PINK, emoji: "👶🏽", image: "/avatars/avatar-baby-6.png" },
  { key: "baby-medium-dark", label: "Baby (Medium Dark)", color: BABY_BLUE, emoji: "👶🏾", image: "/avatars/avatar-baby-3.png" },
  { key: "baby-dark", label: "Baby (Dark)", color: BABY_PINK, emoji: "👶🏿", image: "/avatars/avatar-baby-5.png" },
  { key: "baby-default", label: "Baby (Default)", color: BABY_BLUE, emoji: "👶", image: "/avatars/avatar-baby-4.png" },
];

// Brand new options, not tied to any previous emoji placeholder --
// `emoji` is still populated (used as this.label's implicit fallback
// glyph and to keep AvatarOption's shape uniform) but every one of
// these always has an `image` in practice. Colors are the 7 non-pale
// palette entries from tailwind.config.ts, cycled twice across the 14
// entries (same "avoid washed-out pale tints" rule as above), not
// picked to literally match each illustration's own colors.
export const MORE_AVATARS: AvatarOption[] = [
  { key: "car", label: "Car", color: "#E5B94E", emoji: "🚗", image: "/avatars/avatar-car.png" },
  { key: "motorcycle", label: "Motorcycle", color: "#3A3A3A", emoji: "🏍️", image: "/avatars/avatar-motorcycle.png" },
  { key: "hot-air-balloon", label: "Hot Air Balloon", color: "#DD7E1E", emoji: "🎈", image: "/avatars/avatar-hot-air-balloon.png" },
  { key: "dog", label: "Dog", color: "#E8A0B8", emoji: "🐶", image: "/avatars/avatar-dog.png" },
  { key: "cat", label: "Cat", color: "#4A2C3D", emoji: "🐱", image: "/avatars/avatar-cat.png" },
  { key: "owl", label: "Owl", color: "#3A3A3A", emoji: "🦉", image: "/avatars/avatar-owl.png" },
  { key: "bear", label: "Bear", color: "#5EA83F", emoji: "🐻", image: "/avatars/avatar-bear.png" },
  { key: "elephant", label: "Elephant", color: "#E8A0B8", emoji: "🐘", image: "/avatars/avatar-elephant.png" },
  { key: "panda", label: "Panda", color: "#4A2C3D", emoji: "🐼", image: "/avatars/avatar-panda.png" },
  { key: "ladybug", label: "Ladybug", color: "#C76A8A", emoji: "🐞", image: "/avatars/avatar-ladybug.png" },
  { key: "bee", label: "Bee", color: "#E5B94E", emoji: "🐝", image: "/avatars/avatar-bee.png" },
  { key: "rainbow", label: "Rainbow", color: "#DD7E1E", emoji: "🌈", image: "/avatars/avatar-rainbow.png" },
  { key: "cloud", label: "Cloud", color: "#5EA83F", emoji: "☁️", image: "/avatars/avatar-cloud.png" },
  { key: "book", label: "Book", color: "#C76A8A", emoji: "📖", image: "/avatars/avatar-book.png" },
];

export const AVATARS: AvatarOption[] = [...NATURE_AVATARS, ...BABY_AVATARS, ...MORE_AVATARS];

export const AVATAR_MAP: Map<string, AvatarOption> = new Map(AVATARS.map((a) => [a.key, a]));
