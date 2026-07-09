# Still Growing — Tech Stack Recommendation

**Version 1.0 · Builds on the Architecture Document**

This recommends what to build the platform with. The guiding priorities: fast to build, low cost at launch, scales gracefully, and works well with AI-assisted development (Claude Code). Nothing here is exotic — these are proven, well-documented choices with large communities, which matters because it means Claude Code and any future developer will handle them well.

---

## Guiding Priorities

1. **Ship Phase 1 quickly** without over-engineering.
2. **Low or zero cost at launch** — you should be able to run this for very little until there's real traction.
3. **Scales without a rewrite** — the same stack should carry you from first buyer to thousands of members.
4. **AI-development-friendly** — mainstream, well-documented tools that Claude Code builds confidently.
5. **One language end to end** where possible, to keep it simple.

---

## Recommended Stack (at a glance)

| Layer | Recommendation | Why |
|---|---|---|
| Frontend | Next.js (React) | The prototype is already React-shaped; Next.js is the standard, huge ecosystem |
| Styling | Tailwind CSS | Fast, consistent, matches the utility approach; easy to hit the soft pastel look |
| Backend | Next.js API routes (or a light Node layer) | One codebase, one language; enough for this app's needs |
| Database | PostgreSQL | Relational fits the collection→book→chapter hierarchy perfectly; robust and standard |
| ORM / DB access | Prisma | Type-safe, maps cleanly to the schema, excellent developer experience |
| Auth | Managed auth (see below) | Don't build auth from scratch |
| Hosting | Vercel (frontend/app) + managed Postgres | Simple deploys, generous free tiers, scales up cleanly |
| Video hosting | Dedicated video host (see below) | Gated streaming, don't self-host video |
| Email | SendGrid | Already chosen; serves both marketing (via Systeme.io) and transactional |
| Buyer verification | Systeme.io API | Already chosen |

---

## Why These Choices

### Frontend — Next.js + Tailwind
The prototype is already built in a React-compatible way. Next.js is the mainstream React framework — it handles the app pages, can also host the backend API routes, and deploys effortlessly to Vercel. Tailwind makes it quick to reproduce the warm, soft-pastel design system consistently, and it's what the prototype's styling maps to naturally.

### Backend — Next.js API routes
For an app of this scope, you don't need a separate backend service to start. Next.js can host your API endpoints in the same project — buyer verification, badge claiming, posting reflections, sending notifications. One codebase, one deployment, one language (JavaScript/TypeScript). If the app grows very large later, you can split out services, but there's no need at launch.

### Database — PostgreSQL + Prisma
The data model is relational — collections contain books, books contain chapters, users earn badges. PostgreSQL is the natural fit, is rock solid, and is available cheaply or free from many managed providers. Prisma sits on top as a type-safe way to talk to the database that maps almost one-to-one with the schema document, and it's very AI-development-friendly.

### Auth — use a managed service, don't build it
Authentication is easy to get subtly wrong and not worth building by hand. Use a managed auth solution (options include Clerk, Auth0, Supabase Auth, or NextAuth for a lighter touch). This handles secure login, sessions, and password resets for you. Your custom logic sits on top: after login, verify the email against Systeme.io before granting book access.

### Hosting — Vercel + managed Postgres
Vercel is built for Next.js and makes deployment a non-event — push code, it goes live. Its free tier is generous enough for launch. Pair it with a managed Postgres provider (Supabase, Neon, and Railway all offer free or cheap Postgres with easy setup). This combination means near-zero infrastructure cost until you have real usage.

### Video hosting — a dedicated host, gated
Do not self-host video files — it's slow, expensive in bandwidth, and hard to gate. Use a dedicated video host that supports private/gated playback (options include Mux, Cloudflare Stream, or Bunny Stream). The reward video only becomes accessible once the badge is earned; the host provides secure, signed playback URLs your app hands out after verifying the badge.

### Email — SendGrid (already decided)
SendGrid serves both jobs: Systeme.io routes marketing email through it, and the platform calls its API directly for transactional notifications (reaction received, new book, digests). One provider, one sender reputation.

---

## A Note on Supabase

Worth calling out specifically: Supabase bundles PostgreSQL, auth, file storage, and an API layer into one managed product with a good free tier. For a solo builder shipping a first version, it can collapse several of the choices above into one platform — database, auth, and storage together — which can meaningfully speed up the build. It's a strong option to consider for Phase 1 simplicity. The trade-off is a degree of coupling to one provider; but for launch speed it's very attractive and widely used with Next.js.

**Two viable paths, then:**
- **Path 1 (most bundled):** Next.js + Tailwind on Vercel, with Supabase providing Postgres + auth + storage. Fewest moving parts. Recommended for fastest Phase 1.
- **Path 2 (more modular):** Next.js + Tailwind on Vercel, Prisma + managed Postgres (Neon/Railway), separate managed auth (Clerk). More flexible, slightly more setup.

Either is sound. Path 1 gets you live faster; Path 2 gives more independence between components. For a first launch as a solo operator, Path 1 is the pragmatic pick.

---

## Cost Picture at Launch

With free tiers across Vercel, a managed Postgres/Supabase, and SendGrid, plus low-cost video hosting billed on usage, the platform can run at **essentially zero to a few dollars a month** until you have real traction. Costs scale with success — more members, more video views, more emails — which is exactly the right shape.

---

## What to Tell Claude Code

When starting the build, the essentials to specify:

- **Stack:** Next.js + Tailwind, PostgreSQL via Prisma (or Supabase for the bundled path), deployed on Vercel.
- **Build the data model** from the Data Schema document — collection → book → chapter → badge, with per-book `gamification_config` as JSON.
- **Don't hardcode gamification** — render from each book's config.
- **Managed auth**, with a post-login step verifying the email against the Systeme.io API before granting book access.
- **Gate reward videos** behind earned badges using a dedicated video host's signed URLs.
- **Two apps in one:** the reader-facing app and a separate admin dashboard (owner-only) for managing collections/books/chapters and publishing.
- **Ship Phase 1 scope first** (per the Architecture Document), defer the rest.

---

## Build Order Suggestion

A sensible sequence for the actual build:

1. Data model + database (the schema).
2. Auth + Systeme.io verification on signup.
3. Admin dashboard — enough to create the Baby book with its 12 chapters (so there's real content to build against).
4. Reader Journey view — badge claiming, reflection capture, progress.
5. Reward video gating.
6. Circle — feed, chapter filtering, reflections, reactions.
7. Notifications — in-app indicators + core SendGrid emails.
8. Polish the warm visual design to match the ebook and prototype.
9. Seed the community, soft launch to first buyers.

---

## Confirmed Stack Decision

Still Growing deliberately **matches the existing Chegu.my stack** — Next.js, Supabase, Vercel, GitHub — for consistency and to reuse existing operational knowledge and workflow. No new core framework is introduced.

**Separation from Chegu:** Still Growing uses its own **separate projects** in each service — a separate GitHub repo, a separate Supabase project, and a separate Vercel project. Same accounts and same familiar workflow, but each product fully isolated so their data, users, deployments, and lifecycles never mix.

Still Growing-specific additions on top of the shared base: the **Systeme.io API** (buyer verification), **SendGrid** (app emails), and a **video host** (gated reward videos).

---

## Environment & Keys

Environment keys are **per-project and per-service-instance** — Still Growing gets its own set throughout, never shared with Chegu.

- **Supabase keys** — different. The new separate Supabase project generates its own project URL, anon/public key, and service role key. Chegu's keys point at Chegu's database and must never be reused here.
- **Vercel environment variables** — set per project. Still Growing's Vercel project has its own environment variable store, separate from Chegu's.
- **Systeme.io API key** — belongs to the Systeme.io account (shared account), but generate a **dedicated key for Still Growing** for cleaner tracking. Lives only in Still Growing's environment.
- **SendGrid API key** — belongs to the SendGrid account (shared account), but generate a **separate key scoped for Still Growing**. Good hygiene: revoking it only affects this app.
- **Video host keys** — new, generated when the Still Growing video hosting is set up.

**Rules:**
1. Never copy Chegu's keys into Still Growing, even to test. Mixing keys risks pointing one app at another's database or sending email from the wrong reputation.
2. Each project holds only its own keys — locally in its own `.env` file (git-ignored), in production in its own Vercel project environment settings.
3. For shared-account services (Systeme.io, SendGrid), generate dedicated keys for Still Growing rather than borrowing existing ones — better separation and security.

---

*Next documents to build in the dedicated build chat: API contracts (exact Systeme.io + SendGrid call shapes) and the screen-by-screen flow spec. Both build on this stack and the schema.*
