# Still Growing — Data Schema

**Version 1.0 · Builds on the Architecture Document**

This describes the database structure. It reflects the core principles: multi-book from day one, and data-driven gamification per book. Field types are indicative; adapt to the chosen database.

---

## Overview of Entities

```
User
Collection
Book
Chapter
Badge            (definition, belongs to a chapter)
UserBook         (a user's enrollment/progress in a book)
UserBadge        (a badge a user has earned)
Reflection       (a user's shared reflection for a chapter)
Reaction         (a user's "I felt this" on a reflection)
Notification     (an in-app notification for a user)
```

---

## User

Represents one person. One account per reader, for life, across all books.

| Field | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| email | string, unique | Matches their Systeme.io purchase email |
| display_name | string | Shown in the Circle |
| intro | string, nullable | Optional one-sentence "where I am in life" |
| avatar_color | string | Assigned for their Circle avatar |
| systeme_contact_id | string, nullable | Cached reference to Systeme.io contact |
| created_at | timestamp | |
| last_active_at | timestamp | For engagement tracking |
| is_admin | boolean | Owner access to admin dashboard |

---

## Collection

A themed, life-stage grouping. Launch with one: Baby Wisdom.

| Field | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| name | string | e.g. "Baby Wisdom" |
| description | string | |
| sort_order | integer | Controls display order in Library |
| status | enum | draft / coming_soon / published |
| created_at | timestamp | |

---

## Book

A single gamified journey. Belongs to one collection. Carries its own gamification config.

| Field | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| collection_id | uuid (FK → Collection) | |
| title | string | e.g. "Life Lessons from a Baby" |
| subtitle | string, nullable | |
| description | string | |
| cover_image_url | string | |
| purchase_tag | string | The Systeme.io tag that proves purchase (e.g. "buyer-baby") |
| gamification_config | json | See below — the data-driven mechanics |
| sort_order | integer | |
| status | enum | draft / coming_soon / published |
| created_at | timestamp | |
| published_at | timestamp, nullable | Set when first published; used for launch notifications |

### gamification_config (json)

This is the heart of data-driven gamification. Rather than hardcoding rules, each book declares how it works. Example for the Baby book:

```json
{
  "mechanic": "badges",
  "badge_trigger": "claim_after_read",
  "reward_type": "video",
  "chapter_unlock": "sequential",
  "reflection": { "enabled": true, "required": false, "max_length": 280 }
}
```

Fields within:
- `mechanic` — "badges" for now; leaves room for "streaks", "points" later.
- `badge_trigger` — how a badge is earned. "claim_after_read" for now; future values like "complete_two_challenges".
- `reward_type` — "video" for now; future "audio", "download", "none".
- `chapter_unlock` — "sequential" (each unlocks the next) or "all_open".
- `reflection` — whether reflections are enabled, required, and length cap.

The reader app reads this config and renders accordingly. A future book with a different config renders differently with no code change.

---

## Chapter

One step in a book.

| Field | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| book_id | uuid (FK → Book) | |
| number | integer | Chapter order within the book |
| title | string | e.g. "You Were Born Ready" |
| milestone_label | string | e.g. "Milestone: First Breath" |
| reflect_question | text | The reflection prompt |
| challenge_text | text | The real-world challenge |
| reward_video_url | string, nullable | Gated video; nullable so a book can launch before all videos are ready |
| created_at | timestamp | |

---

## Badge

The badge definition attached to a chapter. Separate from the earning record (UserBadge).

| Field | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| chapter_id | uuid (FK → Chapter) | |
| name | string | e.g. "Arrival Badge" |
| icon | string | Emoji or icon reference |
| description | string | e.g. "You showed up. That's always been enough." |

---

## UserBook

A user's enrollment and progress in one book. Created when they start a book.

| Field | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| user_id | uuid (FK → User) | |
| book_id | uuid (FK → Book) | |
| started_at | timestamp | |
| current_chapter | integer | Highest chapter reached |
| badges_earned | integer | Denormalized count for quick display |
| completed_at | timestamp, nullable | Set when all badges earned |

Unique constraint on (user_id, book_id) — one enrollment per user per book.

---

## UserBadge

A record that a user earned a specific badge. This is the earning event.

| Field | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| user_id | uuid (FK → User) | |
| badge_id | uuid (FK → Badge) | |
| book_id | uuid (FK → Book) | Denormalized for easy per-book queries |
| earned_at | timestamp | |

Unique constraint on (user_id, badge_id) — a badge earned once per user.

---

## Reflection

A user's shared one-sentence reflection for a chapter. Appears in the Circle.

| Field | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| user_id | uuid (FK → User) | |
| chapter_id | uuid (FK → Chapter) | |
| book_id | uuid (FK → Book) | Denormalized for Circle filtering |
| chapter_number | integer | Denormalized for spoiler-safe filtering |
| text | text | The reflection (respects max_length from config) |
| is_hidden | boolean | For moderation |
| created_at | timestamp | |
| hearts_count | integer | Denormalized count of reactions |

---

## Reaction

A user's "I felt this" on a reflection.

| Field | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| user_id | uuid (FK → User) | |
| reflection_id | uuid (FK → Reflection) | |
| created_at | timestamp | |

Unique constraint on (user_id, reflection_id) — one reaction per user per reflection.

---

## Notification

An in-app notification for a user.

| Field | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| user_id | uuid (FK → User) | Recipient |
| type | enum | reaction / new_reflection / new_book / milestone |
| payload | json | Context (who reacted, which book launched, etc.) |
| is_read | boolean | Drives the unread dot/count |
| created_at | timestamp | |
| email_sent | boolean | Whether a SendGrid email was also dispatched |

---

## Key Relationships Summary

- A Collection has many Books.
- A Book has many Chapters and one gamification_config.
- A Chapter has one Badge and one reward video.
- A User has many UserBooks (one per book they've started).
- A User has many UserBadges, Reflections, Reactions, Notifications.
- A Reflection belongs to a Chapter and has many Reactions.

---

## Spoiler-Safe Circle Filtering

The Circle shows a user only reflections from chapters they've reached. Query pattern:

```
Reflections
WHERE book_id = :currentBook
  AND chapter_number <= (user's current_chapter for that book)
  AND is_hidden = false
ORDER BY created_at DESC
```

Filter chips per chapter use the same bound. This is why chapter_number is denormalized onto Reflection.

---

## Notes on Denormalized Counts

`badges_earned`, `hearts_count`, and `current_chapter` are denormalized for fast display. Keep them in sync on write (earning a badge increments badges_earned; a reaction increments hearts_count). This avoids expensive counts on every read.

---

*Next document: Tech Stack Recommendation. After that: API contracts (Systeme.io + SendGrid) and screen-by-screen flow spec.*
