# Still Growing — Architecture Document

**Version 1.0 · Foundation reference for development**

---

## 1. What This Is

Still Growing is a web application that turns motivational ebooks into interactive, gamified journeys with a community layer. Readers buy an ebook, then come to the platform to claim badges, unlock reward videos, share reflections, and connect with others on the same path.

The platform is the owned audience engine. Every reader who joins becomes a warm, reachable member for future book launches, removing dependence on paid advertising channels.

**First product:** Life Lessons from a Baby (12 chapters, 12 badges, 12 challenges).

**The platform is built for many books, launched with one.**

---

## 2. Core Principles

1. **Multi-book from day one.** The platform launches with a single book but is architected to hold many. Never hardcode anything specific to one book into the foundation.

2. **Data-driven gamification.** Each book describes its own structure (chapters, badges, rewards, mechanics). The reader-facing app renders whatever the book's data describes rather than assuming a fixed format. This lets future books use different chapter counts or badge logic without a rebuild.

3. **Owned audience.** The platform exists to capture and retain buyers as a reachable community. Every design decision should favor bringing people back and keeping them engaged.

4. **Warm, calm, human.** The experience mirrors the ebook: soft pastels, gentle language, no aggressive gamification or dark patterns. Reactions are warm ("I felt this"), not cold ("Like").

5. **Themed ecosystem, not a general platform.** Still Growing hosts warm, motivational, personal-growth journeys only. Off-brand or purely technical content does not belong here.

---

## 3. Structural Hierarchy

The content model has four levels, from broadest to most granular:

```
COLLECTION  (life-stage theme, e.g. "Baby Wisdom", "The Teen Years", "Parenthood")
  └── BOOK  (a single gamified journey, e.g. "Life Lessons from a Baby")
        └── CHAPTER  (one unit of the journey)
              └── BADGE + REWARD  (what the reader earns and unlocks)
```

**Collection** — a themed grouping aligned to a life stage or audience. Launch with one: Baby Wisdom.

**Book** — a complete journey a reader progresses through. Each book belongs to one collection. Each book carries its own gamification configuration.

**Chapter** — a single step in a book. Contains the reflect question, the challenge, the badge definition, and the reward video.

**Badge + Reward** — what the reader claims on completing a chapter. In the first book: one badge and one reward video per chapter.

---

## 4. Data-Driven Gamification (Critical)

This is the single most important architectural decision. Do not hardcode "12 chapters, one badge each" into the platform core.

Instead, each **book** carries a configuration that describes:

- How many chapters it has
- What each chapter contains (title, milestone label, reflect question, challenge text)
- How each badge is earned (e.g. "claim after reading" — with room for future triggers like "complete two challenges" or "maintain a streak")
- What each badge unlocks (reward video, or future reward types)
- The badge's name, icon, and description
- Whether the book uses badges at all, or an alternative mechanic

The reader-facing application reads this configuration and renders the journey accordingly. Adding a book with 8 chapters, or different badge logic, becomes a content task in the admin dashboard — not a code change.

**Build for the known structure now** (chapters, badges, reflections, videos as data), **leave the door open** for genuinely different future mechanics (streaks, points) as defined later additions rather than pretending to support them on day one.

---

## 5. Reader-Facing Application

Three primary areas, plus onboarding.

### 5.1 Onboarding & Access (one front door, many books)
- Every ebook links to the **same front door** — the platform homepage. There is one entrance regardless of which book brought the reader in.
- Reader arrives via the CTA at the end of the ebook (link or QR code).
- **Verification & book unlocking:** the reader enters the email they used to purchase. The platform looks that email up in Systeme.io via API and reads **which buyer tags are attached to it**. Each book has a required purchase tag (e.g. "buyer-baby"). The platform unlocks exactly the books whose tags the reader holds.
- **This is how one front door serves many books.** A reader who bought only the baby book sees only that book. A reader who later buys the teen book gets a new tag in Systeme.io, and the teen book appears in their Library automatically on next visit. A reader who owns three books sees all three on one shelf.
- On success, reader creates an account: display name, optional one-sentence intro about where they are in life.
- **One account per reader for life**, across all books and collections. The Systeme.io tags determine what's unlocked; the account is the same no matter which ebook first brought them in.

### 5.2 Library (home)
- The hub. Shows collections, each containing its books.
- At launch: one collection (Baby Wisdom), one live book.
- Only shows collections/books that genuinely exist and are published. No empty placeholder shelves.
- Each book shows the reader's progress if they've started it.
- New books appear here on publish, paired with notifications.

### 5.3 Journey (inside a book)
- The reader's private progress through one book.
- Visual scorecard: chapters as a list, each with badge state (locked / available / earned).
- Progress indicator (e.g. ring showing 3 of 12).
- Tapping an available chapter opens the badge-claim flow: read the reflect question, write a one-sentence reflection, claim the badge, unlock the reward video. Claiming a badge unlocks the next chapter.
- Tapping an earned chapter shows the reward video and the reader's saved reflection.

### 5.4 Circle (community)
- A feed of reflections from other readers **of the same book**.
- Filtered by chapter — readers only see reflections from chapters they have themselves reached (prevents spoilers, keeps it relevant).
- Readers can post their own one-sentence reflection per badge (optional, offered at claim time).
- Warm reactions only ("I felt this"). No open comment threads at launch (revisit later if community matures).
- Each book/collection has its own Circle space so conversations stay relevant to the life stage.

---

## 6. Admin Application

A private dashboard, accessible only to the owner. Completely separate from the reader experience. No code required for day-to-day content operations.

Capabilities:
- **Manage collections:** create, name, order, set status.
- **Manage books:** create within a collection, set title/cover/description, define the book's gamification configuration, set status (draft / coming soon / published).
- **Manage chapters:** add chapters to a book, each with title, milestone label, reflect question, challenge text, badge (name/icon/description), and reward video upload.
- **Publish flow:** flipping a book to "published" makes it live in the Library and triggers launch notifications to relevant members.
- **View members:** see who has joined, their progress, their reflections (for moderation and understanding engagement).
- **Light moderation:** ability to hide/remove a reflection if needed.

The "coming soon" status lets the owner tease an upcoming book/collection with a teaser card that isn't yet enterable.

---

## 7. Integrations

### 7.1 Systeme.io (buyer verification + marketing email)
- **Purpose:** verify that a person signing up actually bought the book; hold the buyer list; send marketing and milestone emails.
- **Method:** Systeme.io public API (key-based auth). On signup, the platform checks the entered email against Systeme.io contacts and confirms the correct purchase tag is present.
- **Tags:** each product purchase applies a specific tag in Systeme.io (e.g. "buyer-baby"). The platform checks for the right tag so access is per-book, not just "any contact."
- **Reverse direction:** the platform can write tags back to Systeme.io to trigger marketing automations (e.g. tag "reached-chapter-6" fires a milestone email).

### 7.2 SendGrid (transactional + app notifications)
- **Purpose:** send app-triggered emails from the platform directly (reaction received, weekly Circle digest, new book launch).
- **Method:** SendGrid API called directly by the platform.
- **Note:** Systeme.io also routes its marketing email through the same SendGrid account, so one email provider and one sender reputation serve both marketing and transactional needs.

### 7.3 Video hosting
- Reward videos (produced with AI avatar + owner's real voice) are hosted and streamed behind the badge unlock.
- Videos are gated — only accessible after the relevant badge is earned.
- Hosting solution to be decided at build (options range from a dedicated video host to a storage-plus-player setup).

---

## 7A. Domain & URL Structure

One brand domain, **stillgrowing.co**, but the platform and the sales pages are split by **subdomain**, because Systeme.io requires ownership of whatever domain or subdomain is connected to it (it controls the paths itself; you cannot hand it a path under your own app's domain).

**The platform (your custom app):**
- Lives on the primary domain: **stillgrowing.co** (optionally the app on a subdomain like app.stillgrowing.co if the root is a marketing homepage).
- This is the single **front door** every ebook links to. All readers land here to join and access their books.

**The sales pages (Systeme.io), one subdomain per book:**
- Each book's sales page gets its own subdomain pointed at Systeme.io:
  - baby.stillgrowing.co → baby book sales page
  - teen.stillgrowing.co → teen book sales page
  - parenting.stillgrowing.co → parenting book sales page
- Systeme.io owns each of these subdomains and manages its own page under it.
- Reads cleanly in ads and content ("go to baby.stillgrowing.co"), and scales simply — each new book just gets a new subdomain (a ~2-minute Systeme.io setup per book).

**Why subdomains, not paths:** Systeme.io connects a domain or subdomain and controls what sits there; it does not accept a path (e.g. stillgrowing.co/baby-book) as a connected sales-page location. So per-book subdomains are the correct, clean pattern.

**Summary:**
- **stillgrowing.co** → platform + front door (your app)
- **[book].stillgrowing.co** → that book's Systeme.io sales page
- Whichever book's sales page brings a buyer in, the ebook always points them to the same front door (stillgrowing.co), where tag-based unlocking (Section 5.1) shows them exactly what they bought.

---

## 8. Notifications

Three layers working together to bring readers back:

1. **In-app indicators** — unread dots/counts on Circle and Library tabs, a notification bell aggregating recent activity. No permissions needed, works everywhere.
2. **Email (via SendGrid)** — the primary re-engagement channel for the 35–60 audience. Triggered by events (reaction received, new book) and digests (weekly Circle summary).
3. **Web push (later)** — browser push for opted-in users, added once the platform has traction. Note iOS requires the app be added to home screen first.

Key re-engagement moments:
- Someone reacts to your reflection.
- New reflections in a Circle you belong to.
- A new book launches (warmest possible launch audience — existing members).

---

## 9. Monetization Model

- **Entry:** the ebook itself, sold via a Systeme.io sales page (low ticket, ~$9–$17).
- **Free platform tier:** badge tracking, scorecard, reflections, Circle access. Enough to feel alive and valuable.
- **Paid tier (phase 2):** unlocks reward videos, deeper community features, and eventually additional library content. Subscription (monthly/annual), introduced once the community has value.
- **The platform as launch engine:** each new book launches to an existing, warm, reachable audience — reducing dependence on paid ads.

---

## 10. Launch Scope (Phase 1)

To ship the first version, the minimum is:

- Account creation + Systeme.io email verification.
- One collection (Baby Wisdom), one published book (Life Lessons from a Baby) with 12 chapters fully configured.
- Journey view with badge claiming and reflection capture.
- Reward video playback gated behind badges (videos can be added as produced — placeholder/"coming soon" acceptable behind a badge if a video isn't ready).
- Circle feed with chapter filtering, reflection posting, and "I felt this" reactions.
- In-app notification indicators + core SendGrid emails (reaction received, new book).
- Admin dashboard sufficient to create/manage collections, books, chapters, and publish.

**Explicitly deferred to later phases:**
- Paid subscription tier.
- Web push notifications.
- Alternative gamification mechanics (streaks, points).
- Open comment threads in Circle.
- Additional collections (Teen, Parent) — added when their books genuinely exist.

---

## 11. Cold-Start Plan (Community Seeding)

The real day-one challenge is not fake placeholders — it's an empty community. Plan:

- The owner seeds the Circle with genuine reflections before/at launch so early readers don't arrive to silence.
- Frame emptiness as invitation ("be the first to share") rather than absence.
- Early buyers become the founding community; their reflections make the space feel alive for the next wave.

---

## 12. Guidance for the Build

When taking this into development (Claude Code):

- Build the **collection → book → chapter → badge** hierarchy as the core data model.
- Make gamification **data-driven per book**, not hardcoded globally.
- Build the **admin dashboard** so content operations never require code.
- Integrate **Systeme.io API** for verification and **SendGrid API** for transactional email.
- Keep the reader experience **warm, calm, and simple** — mirror the ebook's tone.
- Ship **Phase 1 scope** first; treat everything in the deferred list as future work.

---

*This document is the foundation reference. Detailed specs (data schema, screen-by-screen flows, API contracts, tech stack decisions) build on top of it as separate documents.*
