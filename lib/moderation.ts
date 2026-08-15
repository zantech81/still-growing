import { Filter } from "bad-words";
import type { createClient } from "@/lib/supabase/server";

// ── Leetspeak normalization ──────────────────────────────────────────────────
// Maps common obfuscation substitutions back to their base letters so a single
// clean word (e.g. "refund") catches variants like "r3fund" or "ref@nd"
// without enumerating every possible spelling in the blocklists below.
const LEET_MAP: Record<string, string> = {
  "0": "o",
  "1": "i",
  "3": "e",
  "4": "a",
  "5": "s",
  "7": "t",
  "@": "a",
  "$": "s",
  "!": "i",
  "|": "l",
};

export function normalizeText(input: string): string {
  let mapped = "";
  for (const ch of input.toLowerCase()) {
    mapped += LEET_MAP[ch] ?? ch;
  }
  // Anything left that isn't a letter or space (remaining digits, punctuation)
  // becomes a space, so joined-up obfuscation like "f.u.c.k" still tokenizes.
  return mapped
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ── Blocklists ────────────────────────────────────────────────────────────────
// Single words are matched by exact token equality (avoids "class"/"assignment"
// false positives that naive substring matching on words like "ass" produces).
// Multi-word phrases are matched with a word-boundary regex against the
// normalized string.
type Blocklist = { words: Set<string>; phrases: string[] };

function buildBlocklist(raw: string[]): Blocklist {
  const words = new Set<string>();
  const phrases: string[] = [];
  for (const entry of raw) {
    const clean = entry.toLowerCase().trim();
    if (!clean) continue;
    if (clean.includes(" ")) phrases.push(clean);
    else words.add(clean);
  }
  return { words, phrases };
}

// Base profanity/hate blocklist: `bad-words` (the standard npm profanity
// filter, ~900 entries). We keep only its plain-alphabetic entries as the
// "clean" base words. The package also bakes in obfuscated variants like
// "ash0le" or "a55hole", which are redundant once normalizeText() maps
// leetspeak substitutions back to letters before we ever compare.
const badWordsFilter = new Filter();
const PROFANITY_BLOCKLIST = buildBlocklist(
  badWordsFilter.list.filter((w) => /^[a-zA-Z ]+$/.test(w))
);

// Product-harm / complaint-about-us words. Same normalized matching as profanity.
const PRODUCT_HARM_BLOCKLIST = buildBlocklist([
  "refund",
  "chargeback",
  "dispute",
  "reimburse",
  "money back",
  "unauthorized charge",
  "cancel my payment",
  "scam",
  "fraud",
  "fraudulent",
  "ripoff",
  "rip off",
  "scammer",
  "con artist",
  "stole my money",
  "lawsuit",
  "sue",
  "suing",
  "lawyer",
  "attorney",
  "legal action",
  "litigation",
]);

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function phraseRegex(phrase: string): RegExp {
  const parts = phrase.split(" ").map(escapeRegExp);
  return new RegExp(`\\b${parts.join("\\s+")}\\b`);
}

function matchesBlocklist(normalized: string, list: Blocklist): boolean {
  const tokens = normalized.split(" ").filter(Boolean);
  if (tokens.some((t) => list.words.has(t))) return true;
  return list.phrases.some((p) => phraseRegex(p).test(normalized));
}

// ── Contact info (emails / phone numbers / URLs) ─────────────────────────────
// Runs against the RAW text, before leetspeak normalization runs.
// Normalization maps "@" to "a" and strips punctuation, which would destroy
// the very characters an email/URL regex depends on.
const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
const URL_RE = /\b((https?:\/\/|www\.)\S+|[a-z0-9-]+\.(com|net|org|io|co|me|info|biz|xyz)\b)/i;

function hasPhoneNumber(text: string): boolean {
  // A run of digits (allowing spaces/dashes/dots/parens as separators) with
  // at least 7 actual digits: long enough to be a phone number, short
  // enough to not catch things like a 4-digit year.
  const runs = text.match(/\d[\d\s().-]{5,}\d/g) ?? [];
  return runs.some((run) => (run.match(/\d/g) ?? []).length >= 7);
}

// Spelled-out email evasion: "zantech at gmail dot com", "zantech [at]
// gmail (dot) com". Structurally has no "@" or literal "." for EMAIL_RE to
// catch, so this is a separate, deliberately narrow heuristic targeting
// exactly this well-known pattern (word + at + word + dot + tld). It won't
// catch every disguise (that's an ongoing arms race), just this one.
const SPELLED_OUT_CONTACT_RE =
  /\b[a-z0-9](?:[a-z0-9._%+-]*[a-z0-9])?\s*(?:\(\s*at\s*\)|\[\s*at\s*\]|\bat\b)\s*[a-z0-9-]+\s*(?:\(\s*dot\s*\)|\[\s*dot\s*\]|\bdot\b)\s*(?:com|net|org|co|io|me|info|biz|xyz|edu|gov)\b/i;

export function hasContactInfo(text: string): boolean {
  return (
    EMAIL_RE.test(text) ||
    URL_RE.test(text) ||
    hasPhoneNumber(text) ||
    SPELLED_OUT_CONTACT_RE.test(text)
  );
}

// ── Chapter passwords ─────────────────────────────────────────────────────────
// Chapter unlock codes are short alphanumeric strings (e.g. "K3M9P2"), not
// dictionary words, so normalizeText()'s leetspeak map is the wrong tool
// here: it would map digits like "1"/"3" to letters and strip any digit it
// doesn't recognize ("2", "6", "8", "9"...) down to a space, corrupting the
// very characters that make one code different from another. What actually
// needs defeating is the same trick as "k3m-9p2" or "K 3 M 9 P 2" for a
// link -- characters separated by spaces/punctuation to dodge a plain
// substring check -- so this keeps every letter and digit exactly as
// typed and only strips the separators between them.
function normalizeForCodeMatch(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9]/g, "");
}

// A code shorter than this could plausibly appear inside ordinary text by
// coincidence (e.g. a 2-character code inside an unrelated word), so it's
// excluded rather than risk blocking a real reflection over a false match.
// Chapter codes are always generated well above this length in practice.
const MIN_PASSWORD_MATCH_LENGTH = 4;

export function hasChapterPassword(text: string, passwords: string[]): boolean {
  const normalizedText = normalizeForCodeMatch(text);
  if (!normalizedText) return false;

  return passwords.some((code) => {
    const normalizedCode = normalizeForCodeMatch(code);
    return normalizedCode.length >= MIN_PASSWORD_MATCH_LENGTH && normalizedText.includes(normalizedCode);
  });
}

// Fetched live on every call rather than cached: codes are admin-editable
// (components/admin/ChapterForm.tsx) and must stay in sync automatically,
// including chapters from books other than whichever one a given
// reflection happens to be for -- a reader could paste a different
// chapter's password into any reflection, so every currently-set code
// across every chapter is checked regardless of context.
export async function getActiveChapterPasswords(
  supabase: ReturnType<typeof createClient>
): Promise<string[]> {
  const { data } = await supabase.from("chapters").select("unlock_code").not("unlock_code", "is", null);
  return (data ?? []).map((row) => row.unlock_code).filter((code): code is string => !!code);
}

// ── Self-harm ─────────────────────────────────────────────────────────────────
// Deliberately phrase-focused rather than single-word (a bare "suicide" or
// "self-harm" mention still gets caught via the single-word branch of
// matchesBlocklist below, but most entries here are multi-word so they
// don't also fire on unrelated academic/clinical usage of a single word
// out of context). Matched against normalizeText() output, same as
// PROFANITY_BLOCKLIST -- this needs the same leetspeak/obfuscation
// resistance as any other blocklist here, not the chapter-password
// section's separate digit-preserving normalization.
const SELF_HARM_BLOCKLIST = buildBlocklist([
  "kill myself",
  "killing myself",
  "end my life",
  "ending my life",
  "end it all",
  "want to die",
  "wanted to die",
  "wish i was dead",
  "wish i were dead",
  "suicidal",
  "suicide",
  "self harm",
  "self-harm",
  "hurting myself",
  "hurt myself",
  "cutting myself",
  "not worth living",
  "no reason to live",
  "no point in living",
  "better off dead",
  "better off without me",
  "want to end it",
  "ending it all",
]);

// Logs what was written so an admin can follow up directly (see
// supabase/migrations/0043_self_harm_flags.sql), used by every call site
// that can produce a blocked_self_harm verdict: reflection create/edit/
// visibility-toggle and the reviews route. Awaited (not truly detached)
// so the row reliably lands before a serverless function's execution
// context can be frozen/recycled after the response returns -- but
// wrapped so an insert failure can never throw, block, or change the
// compassionate response the caller shows regardless of outcome.
export async function logSelfHarmFlag(
  supabase: ReturnType<typeof createClient>,
  params: { userId: string; bookId: string | null; chapterId: string | null; flaggedText: string }
): Promise<void> {
  try {
    const { error } = await supabase.from("self_harm_flags").insert({
      user_id: params.userId,
      book_id: params.bookId,
      chapter_id: params.chapterId,
      flagged_text: params.flaggedText,
    });
    if (error) {
      console.error("[moderation] Failed to log self-harm flag:", error);
    }
  } catch (err) {
    console.error("[moderation] Unexpected error logging self-harm flag:", err);
  }
}

// ── Spam (soft signal, not a hard block) ────────────────────────────────────
const PROMO_PHRASES = ["dm me", "check out my", "discount code", "click here", "link in bio"];

function hasExcessiveRepeatedChars(text: string): boolean {
  return /(.)\1{4,}/.test(text);
}

function isMostlyCaps(text: string): boolean {
  const letters = text.replace(/[^a-zA-Z]/g, "");
  if (letters.length < 12) return false;
  const upper = letters.replace(/[^A-Z]/g, "");
  return upper.length / letters.length > 0.7;
}

function looksLikeSpam(rawText: string): boolean {
  const lower = rawText.toLowerCase();
  if (PROMO_PHRASES.some((p) => lower.includes(p))) return true;
  if (hasExcessiveRepeatedChars(rawText)) return true;
  if (isMostlyCaps(rawText)) return true;
  return false;
}

// ── Public API ────────────────────────────────────────────────────────────────
export type ModerationVerdict =
  | { type: "ok" }
  | { type: "spam" }
  | { type: "blocked_contact" }
  | { type: "blocked_harmful" }
  | { type: "blocked_product" }
  | { type: "blocked_password" }
  | { type: "blocked_self_harm" };

// Note: this deliberately does NOT check tone/sentiment broadly. Words like
// "failed", "afraid", "no", "hurt", "broken" are never flagged on their
// own. Only profanity/hate, the specific product-harm list above, contact
// info/links, chapter passwords, and the specific self-harm phrases below
// are filtered.
//
// chapterPasswords is caller-supplied (via getActiveChapterPasswords) rather
// than fetched in here, so this function stays a pure, synchronous,
// dependency-free check -- every other rule in this file already works that
// way, and every existing call site already has a Supabase client on hand
// to fetch the live list with.
export function moderateReflection(rawText: string, chapterPasswords: string[] = []): ModerationVerdict {
  if (hasContactInfo(rawText)) return { type: "blocked_contact" };
  if (chapterPasswords.length > 0 && hasChapterPassword(rawText, chapterPasswords)) {
    return { type: "blocked_password" };
  }

  const normalized = normalizeText(rawText);

  // Checked before profanity so self-harm language wins over any
  // simultaneous profanity match -- the compassionate response matters
  // more here than the generic "keep this space kind" one.
  if (matchesBlocklist(normalized, SELF_HARM_BLOCKLIST)) return { type: "blocked_self_harm" };
  if (matchesBlocklist(normalized, PROFANITY_BLOCKLIST)) return { type: "blocked_harmful" };
  if (matchesBlocklist(normalized, PRODUCT_HARM_BLOCKLIST)) return { type: "blocked_product" };
  if (looksLikeSpam(rawText)) return { type: "spam" };

  return { type: "ok" };
}
