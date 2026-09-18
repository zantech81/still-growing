---
name: Still Growing
description: A companion app for "Life Lessons from a Baby" — reads as a continuation of the book, not a separate product.
colors:
  cream: "#FBF7F2"
  plum: "#4A2C3D"
  ink: "#3A3A3A"
  pink-pale: "#F7E1E9"
  pink-dusty: "#E8A0B8"
  pink-deep: "#C76A8A"
  blue-soft: "#E6F1FB"
  green-soft: "#EAF3DE"
  gold: "#E5B94E"
  leaf: "#5EA83F"
  leaf-soft: "#A6E2BE"
  marigold: "#DD7E1E"
  marigold-soft: "#FBE4C7"
typography:
  display:
    fontFamily: "Georgia, 'Playfair Display', serif"
    fontWeight: 400
  body:
    fontFamily: "var(--font-nunito), system-ui, sans-serif"
    fontWeight: 400
rounded:
  lg: "0.5rem"
  full: "9999px"
  xl2: "1.5rem"
components:
  button-primary:
    backgroundColor: "{colors.pink-pale}"
    textColor: "{colors.pink-deep}"
    rounded: "{rounded.xl2}"
    padding: "12px 24px"
  button-primary-hover:
    backgroundColor: "{colors.pink-dusty}"
  button-admin:
    backgroundColor: "{colors.plum}"
    textColor: "#FFFFFF"
    rounded: "{rounded.xl2}"
    padding: "10px 24px"
---

# Design System: Still Growing

## Overview

Still Growing is the reading-companion app for "Life Lessons from a Baby." Its palette is pulled directly from the book's own Canva source (see `tailwind.config.ts` header comment), a deliberate choice so the app reads as a continuation of the book rather than a separate product with its own branding.

The system is warm, soft-edged, and editorial: a serif display face for headings over a warm cream page, with a small family of pale, dusty tones (pink, blue, green, gold) used as content-area accents, plus two feature-specific "nav-only" colors (leaf, marigold) reserved for the Growing and Circle tabs respectively. Two distinct button languages coexist by design: reader-facing surfaces use a soft pink pill (low-contrast, book-like); admin surfaces use a solid plum button (higher-contrast, tool-like). This is a confirmed split, not drift — see `bg-plum` (admin CRUD forms) vs. `bg-pink-pale` (reader-facing CTAs) below.

**Key Characteristics:**
- Warm cream base with a subtle pink-tinted gradient wash on `body` (`app/globals.css`), never a flat white.
- Serif display type (`font-display`) on every heading; body copy stays in the app's loaded Nunito web font (`font-body`), never the literal string "Nunito" (a past bug — see `tailwind.config.ts` comment).
- One large, soft radius (`rounded-xl2`, 1.5rem) for primary containers and CTAs; smaller `rounded-lg`/`rounded-full` for secondary chrome, pills, and badges.
- Feature colors (leaf for Growing, marigold for Circle) are nav-only accents and must not be reused as generic UI color, by explicit design comment in `tailwind.config.ts`.

## Colors

The palette groups into one warm neutral base, one primary accent family (pink), and a set of small, single-purpose accents — nothing is used purely decoratively.

### Primary
- **Dusty Rose** (`pink-dusty` #E8A0B8): the interactive/hover accent — button hovers, active toggle states, highlighted chips.
- **Deep Rose** (`pink-deep` #C76A8A): text-on-pale and "selected/active" solid state — active filter chips, badges, the reader-facing button label color.
- **Pale Rose** (`pink-pale` #F7E1E9): the default reader-facing button and content-tile background — the app's most common CTA surface.

### Secondary
- **Plum** (`plum` #4A2C3D): heading color (`h1`–`h3` via `globals.css`) and the admin-surface solid-button color. Doubles as brand-dark text and admin "confirm" affordance.
- **Ink** (`ink` #3A3A3A): default body text color, distinct from and slightly warmer-neutral than plum.

### Tertiary (status/content accents, single-purpose)
- **Gold** (`gold` #E5B94E): "coming soon" / progress signaling.
- **Blue Soft** (`blue-soft` #E6F1FB) / **Green Soft** (`green-soft` #EAF3DE): paired pale content-tile backgrounds (e.g. Library "available now" vs. other states); each means something specific in context, not general-purpose decoration.
- **Leaf** (`leaf` #5EA83F) / **Leaf Soft** (`leaf-soft` #A6E2BE): Growing nav tab only — literally a tree/growth feature, deliberately cooler/mintier than `green-soft` so the two don't read as "two pills that happen to both be pale green."
- **Marigold** (`marigold` #DD7E1E) / **Marigold Soft** (`marigold-soft` #FBE4C7): Circle nav tab only — warm, community feeling, deliberately not reusing pink (would duplicate the active-nav pink-deep) or blue-soft/gold (already mean something specific elsewhere).

### Neutral
- **Cream** (`cream` #FBF7F2): page background base, blended with `#FDF0F4` in a 160° gradient (`globals.css` `body`) — never a flat single color.

### Named Rules
**The Nav-Color Exclusivity Rule.** `leaf`/`leaf-soft` and `marigold`/`marigold-soft` are reserved for the Growing and Circle nav tabs (`AppNav.tsx`) and their own feature surfaces. Reusing them as generic UI accent color elsewhere breaks the tab-to-feature association and is a design-system violation, not a stylistic choice.

**The Two-Button-Language Rule.** Reader-facing primary actions are a soft `pink-pale`/`pink-dusty` pill with `pink-deep` text. Admin/CRUD primary actions are a solid `plum` button with white text. A `plum` button on a reader page (or a soft pink button in `/admin`) is off-system for that context.

## Typography

**Display Font:** Georgia, with `'Playfair Display'` and `serif` fallbacks (`font-display`)
**Body Font:** the Nunito variable font loaded via `next/font/local` in `app/layout.tsx`, exposed as `--font-nunito` (`font-body`), falling back to `system-ui`/`sans-serif`

**Character:** an editorial serif for structure and warmth on headings, paired with a rounded, friendly sans for everything read at length — a "storybook heading, conversational body" pairing.

### Hierarchy
- **Display** (`font-display`, applied globally to `h1`/`h2`/`h3` via `globals.css`): section and page titles; always paired with `text-plum`.
- **Body** (`font-body`, default): all running text, form labels, buttons.
- Observed size scale in practice is Tailwind's default step scale (`text-xs` through `text-xl`, occasional `text-2xl`+ for hero-style headings) with no project-specific custom scale — sizes are chosen per-component rather than from a documented hierarchy. This is the area most likely to show drift under audit (see Do's and Don'ts).

## Layout

Standard Tailwind responsive breakpoints, no custom container/grid system observed. Content is generally centered in a max-width column with page-level padding; admin list/table pages use denser spacing than reader-facing pages. No project-wide documented spacing scale was found — spacing values (`p-`, `gap-`, `px-`/`py-`) are chosen per-component. This is the second-most-likely area to show drift under audit.

**Content width:** `max-w-3xl` (768px) is the standard reader-page width (Library, Journey, Growing, and the homepage's below-fold content). Circle is a deliberate exception, kept at `max-w-xl` (576px) to respect the 65–75ch prose-width guidance above for its journal-style reflection quotes — widening it (checked at both `max-w-2xl` and `max-w-3xl`) pushed lines past 80 characters with no compensating benefit, since a stacked feed of short quotes has no dead space to fill the way a card grid does. `/login` stays at `max-w-sm` (384px) as a minimal auth form, not a reader page.

## Elevation & Depth

Flat by default. No shadow vocabulary was found in `tailwind.config.ts` or repeated in components; depth, where it exists at all, is conveyed through the pale-tint background layering (e.g. `pink-pale` tiles on the `cream` page) rather than `box-shadow`.

### Named Rules
**The Flat-By-Default Rule.** Surfaces are distinguished by background tint (pale accent on cream/white), not by shadow. Introducing drop shadows for "depth" is off-system unless a specific interactive affordance (drag, modal) needs it.

## Shapes

Two-tier radius language:
- **`rounded-xl2`** (1.5rem, custom token): primary containers, cards, and CTA buttons — the signature "soft, book-like" shape, used most heavily in reader-facing forms and buttons (`ClaimChapter.tsx`, `AccountForm.tsx`, `ReviewForm.tsx`, `OnboardingForm.tsx`, `LoginForm.tsx`).
- **`rounded-lg`** and **`rounded-full`**: secondary chrome — admin list rows/cards, badges, pills, toggles, small inline buttons.

No borders or clipping patterns beyond these two radii were found in repeated use.

## Components

### Buttons
- **Shape:** `rounded-xl2` (1.5rem) for primary actions on both reader and admin surfaces; `rounded-lg` for secondary/inline actions.
- **Reader-facing primary:** `bg-pink-pale`, `hover:bg-pink-dusty`, `text-pink-deep`, `font-display` label, `disabled:opacity-50`.
- **Admin primary:** `bg-plum`, `text-white`, `font-medium`, `hover:opacity-90`, `disabled:opacity-50`.
- **Active/selected state (filter chips, toggles):** solid `bg-pink-deep text-white` (or `bg-plum text-white` for a second-tier active state, seen in `CircleFeed.tsx`) vs. unselected `bg-pink-pale text-pink-deep`.

### Cards / Containers
- **Corner Style:** `rounded-xl2` for primary content tiles (book/chapter cards, form sections); `rounded-lg` for denser admin cards.
- **Background:** pale accent tint (`pink-pale`, `blue-soft`, `green-soft`) on the cream page background — never a flat white card observed.
- **Shadow Strategy:** none (see Elevation & Depth).

### Navigation
`AppNav.tsx` defines 4 tabs (Library, Journey, Circle, Growing) with per-tab solid/soft/soft-text color triples (only Circle and Growing carry their own marigold/leaf colors; Library and Journey use the shared pink system). Active-tab icons render at `strokeWidth={2}` vs. `1.5` inactive — the only structural (non-color) active-state signal.

### Badges
- **Verified badge / unread-count pill:** `rounded-full`, solid `bg-pink-deep text-white`, small fixed size (`min-w-[18px] h-[18px]`) — the app's smallest recurring shape token, used identically in `CircleUnreadCount.tsx` and `admin/AdminNav.tsx`.

## Illustration

Direction B's site-wide illustrated-warmth system, extending the existing palette and shape language rather than replacing it. Flagship instance: the homepage (`/`) hero.

**Sprout** (`components/SproutIllustration.tsx`): the established brand mascot, a chibi baby character with an existing reference sheet (kawaii flat-vector, thin dark-brown linework, cel-shaded pastel, wispy light-brown hair, sage-green trim) already used in the milestone videos and the avatar picker. One asset today, `public/illustrations/hero-sprout-growing.png` (transparent PNG, Sprout at the base of a blooming badge tree) — one pose only, no pose-variant prop yet. Two size variants: `hero` (large Persuade placement, e.g. the homepage two-column hero) and `small` (an Operate-mode supporting detail: Library's empty-catalog message and first-run "zero unlocked books" banner, Journey's all-badges-claimed completion moment, Circle's genuine zero-reflections empty state).

**Growing page: no SproutIllustration.** The procedural `GrowingTree` component already carries the "nothing growing yet" visual weight on its own — at zero connections it renders leafless (bare trunk/branches, `visibleLeafCount = 0`), a distinct illustrated treatment in its own right. Adding a second illustrated device (Sprout) to that same empty moment would compete with it rather than complement it, so this page is a deliberate exception to the small-variant pattern above.

**`<AvatarStack>`** (`components/AvatarStack.tsx`): the "N people already here" social-proof pattern — a row of real members' avatars (sampled from `public_profiles`, filtered to profiles with a chosen `avatar_key` so the row reads as illustrated art, not initials) next to a real sitewide count. The count is total badges claimed (`count(*)` on `user_badges`, the ground-truth earned-badge join table, not the denormalized `user_books.badges_earned` counter) rather than a member count — it pairs with the "Twelve badges" headline narrative and both `public_profiles`/`user_badges` are already anon-readable, so it renders identically for signed-out cold traffic and signed-in readers. Renders nothing when there's no real data yet (no member sample, or zero badges claimed) rather than showing a hollow "0" or an empty avatar row.

### Named Rules
**The Persuade-Scale Rule.** Illustration appears at hero scale only on Persuade surfaces (homepage, and by extension `/login`, `/reviews` per the site-wide plan). Operate surfaces (Library, Journey, Circle, Growing, Account, Admin) get the `small` variant at most, in a precise supporting-detail role (an empty state, a completion moment) — never a large hero treatment. A hero-scale Sprout illustration on an Operate surface is off-system, the same way a `bg-plum` admin button on a reader page is off-system for the Two-Button-Language Rule above.

## Do's and Don'ts

### Do:
- **Do** use `pink-pale`/`pink-dusty`/`pink-deep` for reader-facing primary actions; keep the label text `pink-deep` on a `pink-pale` background, never white-on-pale.
- **Do** use solid `plum` for admin primary actions; keep this distinct from the reader-facing pink button language.
- **Do** reserve `leaf`/`leaf-soft` for Growing and `marigold`/`marigold-soft` for Circle; do not reuse them as generic accent color on other pages.
- **Do** use `rounded-xl2` for primary containers/CTAs and `rounded-lg`/`rounded-full` for secondary chrome, matching the existing two-tier shape language.
- **Do** apply `font-display` to headings and keep body copy in `font-body` (the loaded Nunito variable, never the literal font name "Nunito").
- **Do** use `<SproutIllustration>` and `<AvatarStack>` for illustrated-warmth and social-proof needs rather than a page hand-placing its own `<img>` or hardcoding a count.

### Don't:
- **Don't** introduce `box-shadow`-based elevation; this system conveys depth through pale-tint backgrounds, not shadows.
- **Don't** introduce a flat white card background; content tiles sit on pale accent tints over the cream page.
- **Don't** reach for raw Tailwind gray/slate/amber utilities (`gray-200`, `gray-300`, `amber-400`, etc.) where a palette token already covers the same role — several are already in the codebase (see audit findings) and are off-palette by the project's own token set.
- **Don't** hard-code a palette hex value (e.g. `#E8A0B8`) in a `style` prop or inline SVG fill where a Tailwind class (`fill-pink-dusty`, if extended, or the `bg-`/`text-` utility) would do the same job — several current inline-SVG uses are legitimate (Tailwind classes don't reach SVG `fill`/`stroke` without arbitrary-value syntax) but should use the token value exactly, never an approximation.
- **Don't** place a hero-scale illustration on an Operate surface, or invent a placeholder/fake social-proof number — `<AvatarStack>` renders nothing rather than a hollow zero when there's no real data yet.
