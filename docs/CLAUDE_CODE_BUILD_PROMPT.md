# Still Growing — Build Brief for Claude Code

You're building the web app for "Still Growing," the companion platform to the
ebook "Life Lessons from a Baby." A scaffold already exists in this repo
(Next.js 14 + Tailwind + Supabase). Read everything in `/docs` first, then
read the existing code before writing anything new, so you follow the
patterns already established rather than inventing new ones.

## Read first, in this order

1. `/docs/Still_Growing_Architecture.md` — product structure, principles, phase 1 scope
2. `/docs/Still_Growing_Data_Schema.md` — original data model reference
3. `/docs/Still_Growing_Tech_Stack.md` — stack rationale, build order, env key hygiene
4. `supabase/migrations/*.sql` — the actual schema as built (source of truth over the docs above where they differ — see "Decisions that override the docs" below)
5. `app/`, `components/`, `lib/` — existing scaffold, follow these patterns
6. `README.md` — current state and known gaps

## Decisions that override the docs

The docs above were written before some product decisions changed. These
override anything in the docs that conflicts:

- **No purchase verification, anywhere.** Signup is open — email/OAuth only,
  no Systeme.io tag check, no redemption codes. This applies to both the
  Systeme.io sales channel and Amazon KDP. Systeme.io is used only as a
  write-target: sync new signups there as contacts (tag: `platform-member`)
  for marketing purposes, never as a gate.
- **Reward videos are free for everyone at launch**, not held behind a future
  paid tier. The monetization doc's "paid tier unlocks videos" is deferred
  to a later phase, not phase 1.
- **Auth is Google OAuth + email magic link** via Supabase Auth, matching
  the Chegu.my pattern. Apple sign-in is intentionally not implemented —
  no Apple Developer account yet. If this changes later, adding it is a
  self-contained addition (Supabase provider config + one button), not a
  structural change.
- **Terminology:** the book's private prompt is always called "Reflect."
  The user's own piece that gets shared to the Circle is always called
  "My Reflection" (first person, in the claim UI) or "Your Reflection"
  (second person, in copy). Never use "note," "post," "entry," or "echo"
  for this. Keep this consistent across every screen.
- **Deep links:** every chapter has a permanent route `stillgrowing.co/<book-slug>/ch<N>`
  (e.g. `/baby/ch4`). Visiting this link never auto-claims a badge — it
  requires the reader to write their own reflection to claim, which is what
  unlocks the video and posts to the Circle (see `components/ClaimChapter.tsx`
  for the existing pattern — extend it, don't replace its logic).
- **Country flag (opt-in, display-only):** `users.country_code` is a
  nullable ISO 3166-1 alpha-2 text column (e.g. `'MY'`, `'US'`) added in
  migration `0006_add_country_flag.sql`. It is **never required, never
  prompted at signup, and never shown as a placeholder** when absent. Users
  set it voluntarily from `/account`. In the Circle (Step 4), display a
  flag emoji next to the user's name using `lib/countries.ts`'s `codeToFlag`
  helper **only** if `country_code` is non-null — if it's null, show nothing.
  Do not reverse or work around this: absence of a flag is intentional and
  correct, not an error state to fill.
- **Per-book access control via redemption codes:** Each book has a
  `redemption_code` (unique nullable text, migration `0007`) that readers
  enter once to unlock a book. A successful entry creates a row in
  `book_unlocks` (user_id, book_id, unlocked_at). **`book_unlocks` is the
  gate**: the Journey page (`app/[book]/page.tsx`) and every chapter page
  (`app/[book]/[chapter]/page.tsx`) redirect to `/library` if no matching
  row exists, preventing direct-URL access without the code. The Library
  shows a locked card (grayscale cover, inline code field) for locked books.
  Correct code → POST `/api/redeem` → `book_unlocks` insert →
  `router.refresh()` to reveal the book. Wrong code → inline error. Codes
  are compared case-insensitively. The Baby Wisdom book code is `'GROWBABY'`.
  All books require a code — there is no open-access flag. Codes are set by
  the admin on the book create/edit form (Step 5); `lib/reservedSlugs.ts` is
  the single source of truth for slug words that must never be used as book
  slugs, imported by both `middleware.ts` and the admin book form.

## Build order

Work through this sequence. After each numbered step, stop, summarize what
you built, and let me review before continuing to the next one — don't
build all of this in one uninterrupted pass.

1. **Verify the scaffold runs.** Install dependencies, confirm the dev
   server starts, confirm the existing `/baby/ch1` route and login flow
   work against a real (or locally-run) Supabase instance. Fix anything
   broken before adding new features.

2. **Library (home) view.** Per Architecture §5.2. Shows collections, each
   containing its books, with progress shown per book if started. Only
   show published content. Match the visual language already established
   in `tailwind.config.ts` and `app/page.tsx` (cream background, dusty
   pink/pale pink accents, serif display headings).

3. **Journey view.** Per Architecture §5.3. Chapter list with badge state
   (locked/available/earned), progress ring (X of 12), tapping an
   available chapter goes to the existing `/baby/chN` claim flow, tapping
   an earned chapter shows the video + their saved reflection again.

4. **Circle.** Per Architecture §5.4 and Data Schema's "Spoiler-Safe Circle
   Filtering" section — this query pattern is important, don't show a
   reader reflections from chapters they haven't reached yet. Chapter
   filter chips, "I felt this" reactions (warm language only, never
   "Like"), no comment threads.

5. **Admin dashboard.** Per Architecture §6. Owner-only (gate on
   `users.is_admin`). CRUD for collections/books/chapters/badges, publish
   flow, member list, light moderation (hide a reflection). This is where
   Mux video uploads get attached to a chapter's `mux_playback_id`.

6. **Systeme.io integration.** Write-only sync on signup (create/tag
   contact). Use a dedicated Still Growing API key (see `.env.example`),
   never touch or reference Chegu's key.

7. **SendGrid notifications.** Reaction received, new book launched. Follow
   Architecture §8's three-layer notification approach — build the in-app
   layer (bell/unread dots) alongside this if not already present from
   step 3-4's work.

8. **Polish pass.** Responsive down to mobile, keyboard focus states,
   loading/empty states written in the product's own warm voice per the
   book (see the existing CTA copy in `app/page.tsx` for tone reference).

## Working style

- Ask me before making any product decision that isn't already settled
  above or in `/docs` — don't guess and move on if something's genuinely
  ambiguous.
- Keep environment keys separated per the Tech Stack doc's hygiene rules —
  this is a separate Supabase/Vercel/GitHub project from Chegu.my, always.
- Commit as you go with clear messages, one logical chunk per commit,
  rather than one giant commit per step.
