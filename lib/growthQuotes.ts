import { hashSeed } from "@/lib/growingTree";

export type GrowthQuote = {
  text: string;
  // Quotes pulled from the book are attributed to their originating
  // chapter/section (see supabase/migrations/0003_seed_baby_book.sql for
  // the verbatim chapter titles/milestones this was matched against).
  // Quotes written fresh for this feature are attributed to the platform
  // itself, so they never read as misquoted book content.
  source: string;
};

// Matched by theme against each chapter's actual title/milestone_label/
// reflect_question (0003_seed_baby_book.sql, marked verbatim from the
// source PDF there) -- this file doesn't have the literal page text to
// place, so the pairing below is a best-effort thematic match, not a
// verified page citation. One quote reads as closing/afterword material
// rather than any one chapter's theme, attributed to "A Final Word"
// rather than forced onto a specific chapter.
export const GROWTH_QUOTES: GrowthQuote[] = [
  { text: "You were born ready.", source: "Chapter 1, You Were Born Ready" },
  {
    text: "The crawl isn't the failure. The crawl is the foundation.",
    source: "Chapter 4, Crawl Before You Sprint",
  },
  {
    text: "Falling isn't the opposite of walking. It's part of it.",
    source: "Chapter 5, Falling Is Part of Walking",
  },
  {
    text: "You are not finished. You are not behind. You are exactly where a growing thing should be.",
    source: "Chapter 12, You're Still Growing",
  },
  {
    text: "Growth doesn't have a finish line, and neither does this book.",
    source: "Chapter 12, You're Still Growing",
  },
  {
    text: "Every single day, you wake up with the same potential you had on the day you were born.",
    source: "Chapter 12, You're Still Growing",
  },
  {
    text: "Still arriving. Still learning. Still falling and getting back up. Still curious. Still growing.",
    source: "A Final Word",
  },
  { text: "Every day you tend to something, it grows a little more.", source: "Still Growing" },
  { text: "A tree doesn't rush. Neither do you.", source: "Still Growing" },
  { text: "Small roots, real growth.", source: "Still Growing" },
  { text: "Nobody sees the roots. Everybody sees the tree.", source: "Still Growing" },
];

// Deterministic per user per day: reuses lib/growingTree.ts's generic
// string hash (same one that seeds the tree) rather than duplicating a
// hashing function. Combining user id + calendar date means the SAME
// person sees a new quote roughly once a day, and different people see
// different quotes on the same day -- varied across visits without any
// stored state or true randomness.
export function pickGrowthQuote(userId: string, today: Date = new Date()): GrowthQuote {
  const dateKey = today.toISOString().slice(0, 10); // YYYY-MM-DD
  const seed = hashSeed(`${userId}-${dateKey}`);
  return GROWTH_QUOTES[seed % GROWTH_QUOTES.length];
}
