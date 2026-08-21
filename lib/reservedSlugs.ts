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
  "u",           // Public profile pages (/u/[userId])
  "reviews",     // Public reviews page (app/reviews/page.tsx) -- without
                 // this, middleware.ts's isJourneyRoute check would treat
                 // it as an unrecognized book slug and force a login
                 // redirect, breaking the page's "no auth required" ask.
  "privacy",     // Public privacy policy page (app/privacy/page.tsx) --
                 // same reasoning as "reviews" above.
  "embeds",      // public/embeds/* static assets (e.g. reviews-widget.js).
                 // Not actually at risk of the same middleware bug (that
                 // check only ever matches a bare single-segment path with
                 // no further slash/extension, and every real request here
                 // is /embeds/<file>.js), reserved purely so a future book
                 // slug can't collide with this static-asset namespace.
]);
