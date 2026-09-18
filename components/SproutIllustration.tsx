type Size = "hero" | "small";

// One pose for now (public/illustrations/hero-sprout-growing.png -- Sprout
// at the base of a blooming badge tree). Size variants exist so each
// surface requests a scale rather than hand-placing its own <img> --
// "hero" for a large Persuade placement (the homepage two-column layout),
// "small" for a future Operate empty-state touch (Library/Circle/Growing
// per the site-wide plan), never used at hero scale there per DESIGN.md's
// Persuade-gets-large / Operate-gets-small rule.
const SIZE_CLASSES: Record<Size, string> = {
  hero: "w-full max-w-[220px] sm:max-w-xs md:max-w-sm",
  small: "w-16 sm:w-20",
};

type Props = {
  size?: Size;
  className?: string;
};

export default function SproutIllustration({ size = "hero", className }: Props) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/illustrations/hero-sprout-growing.png"
      alt="Illustration of Sprout, the Still Growing mascot, standing at the base of a tree blooming with badge icons"
      className={`${SIZE_CLASSES[size]} h-auto ${className ?? ""}`}
    />
  );
}
