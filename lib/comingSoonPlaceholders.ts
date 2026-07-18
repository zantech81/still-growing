// Shared between the admin BookForm (picker) and the Library page (render
// fallback) so the two never drift out of sync.
export const PLACEHOLDER_PRESETS = [
  "A new journey is coming.",
  "Something new is on its way.",
  "More stories, coming soon.",
  "Still growing, in more ways than one.",
] as const;

export const DEFAULT_PLACEHOLDER_TEXT = PLACEHOLDER_PRESETS[0];
