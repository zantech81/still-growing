import FlagImg from "@/components/FlagImg";
import { AVATAR_MAP } from "@/lib/avatars";

type Props = {
  avatarKey: string | null;
  countryCode: string | null;
  // Used only for the final (initials) fallback tier's background --
  // the same per-user random hex CircleFeed's own initials circle has
  // always used (see handle_new_user in 0001_init.sql).
  avatarColor: string;
  name: string;
  size?: number;
  className?: string;
};

// Three-tier fallback, in order: a picked avatar_key, then a country
// flag if one's set, then nickname/display-name initials in a colored
// circle -- matching what the Circle feed already fell back to before
// this component existed. Used by both the new profile page and (once
// wired up) CircleFeed itself, so the two never drift out of sync.
export default function Avatar({ avatarKey, countryCode, avatarColor, name, size = 32, className }: Props) {
  const avatar = avatarKey ? AVATAR_MAP.get(avatarKey) : null;

  if (avatar) {
    // Real illustrated art when this option has one (see lib/avatars.ts);
    // "plum"/"ink" don't yet, so they fall through to the original
    // emoji-on-color rendering below unchanged.
    if (avatar.image) {
      return (
        <div
          className={`rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center ${className ?? ""}`}
          style={{ width: size, height: size, backgroundColor: avatar.color }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={avatar.image} alt={avatar.label} className="w-full h-full object-cover" />
        </div>
      );
    }

    return (
      <div
        role="img"
        aria-label={avatar.label}
        className={`rounded-full flex-shrink-0 flex items-center justify-center ${className ?? ""}`}
        style={{ width: size, height: size, backgroundColor: avatar.color, fontSize: size * 0.55, lineHeight: 1 }}
      >
        {avatar.emoji}
      </div>
    );
  }

  if (countryCode) {
    return (
      <div
        className={`rounded-full flex-shrink-0 flex items-center justify-center bg-gray-100 ${className ?? ""}`}
        style={{ width: size, height: size }}
      >
        <FlagImg code={countryCode} className="rounded-sm" />
      </div>
    );
  }

  const initial = (name[0] ?? "?").toUpperCase();
  return (
    <div
      className={`rounded-full flex-shrink-0 flex items-center justify-center font-medium text-white ${className ?? ""}`}
      style={{ width: size, height: size, backgroundColor: avatarColor, fontSize: size * 0.44 }}
    >
      {initial}
    </div>
  );
}
