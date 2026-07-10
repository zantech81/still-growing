# Still Growing

Web app for "Life Lessons from a Baby" — badges, videos, and reflections
that continue the ebook online. Built per the Architecture, Data Schema,
and Tech Stack documents, with the honor-system decision applied (no
purchase verification; Systeme.io is a marketing-capture write-target only).

## What's scaffolded so far

- **Next.js 14 (App Router) + Tailwind**, palette pulled from the actual
  ebook design (see `tailwind.config.ts`)
- **Supabase schema** (`supabase/migrations/`): full Collection → Book →
  Chapter → Badge hierarchy, progress tracking, reflections, reactions,
  notifications, and Row-Level Security policies
- **Seed data** for the Baby Wisdom book, all 12 chapters verbatim-verified
  against `Life_Lessons_from_a_Baby_Ebook_v6.pdf`
- **Auth**: Google + Apple OAuth + email magic link, via Supabase Auth,
  with an auto-created profile row on signup
- **The `/baby/ch4`-style deep links** from the book: `app/[book]/[chapter]/page.tsx`
  — locks chapters ahead of progress, requires a written reflection to claim
  (never auto-claims just from visiting the link), then unlocks the Mux video
- **Homepage** (`app/page.tsx`): digital twin of the book's "Your Journey
  Continues" closing CTA page
- **Login page**: no purchase check, matches the "Begin" language from the book

## Not yet built

- Library (home) view
- Journey view (scorecard/progress ring)
- Circle feed (spoiler-safe reflection feed + reactions)
- Admin dashboard
- Systeme.io marketing-capture sync on signup
- SendGrid notification emails
- Mux upload/webhook handling for the admin side

## Setup

```bash
npm install
cp .env.example .env.local   # fill in your Still Growing Supabase/Mux/etc keys
```

Run the migrations against a **new, separate Supabase project** (per the
Tech Stack doc — never share Chegu's project):

```bash
supabase link --project-ref <your-still-growing-project-ref>
supabase db push
```

Enable Google and Apple providers in Supabase Auth settings, and add
`https://stillgrowing.co/auth/callback` (and your local dev URL) as a
redirect URL.

```bash
npm run dev
```

## Build order

Following the sequence from the Tech Stack doc:
1. ✅ Data model + database
2. ✅ Auth (Systeme.io verification step intentionally skipped — honor system)
3. ⬜ Admin dashboard
4. ⬜ Journey view (badge claiming is built at the route level; scorecard UI isn't)
5. ⬜ Reward video gating (Mux player wired in; admin upload flow isn't)
6. ⬜ Circle
7. ⬜ Notifications
8. ⬜ Visual polish pass
9. ⬜ Seed community, soft launch
