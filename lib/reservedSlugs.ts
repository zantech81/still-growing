// Single source of truth for top-level route slugs that must never be used
// as book slugs. Imported by middleware.ts (journey-route guard) and the
// admin book form (slug validation before save).
export const RESERVED_SLUGS = new Set([
  "login",
  "library",
  "circle",
  "growing",
  "journey",
  "account",
  "auth",
  "api",   // Next.js API routes live under /api/*
  "admin",       // Admin dashboard
  "onboarding",  // Profile completion gate
  "r",           // Public share landing pages (/r/[shareId])
]);
