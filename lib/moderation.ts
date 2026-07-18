import { Filter } from "bad-words";

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
  | { type: "blocked_product" };

// Note: this deliberately does NOT check tone/sentiment. Words like "failed",
// "afraid", "no", "hurt", "broken" are never flagged. Only profanity/hate,
// the specific product-harm list above, and contact info/links are filtered.
export function moderateReflection(rawText: string): ModerationVerdict {
  if (hasContactInfo(rawText)) return { type: "blocked_contact" };

  const normalized = normalizeText(rawText);

  if (matchesBlocklist(normalized, PROFANITY_BLOCKLIST)) return { type: "blocked_harmful" };
  if (matchesBlocklist(normalized, PRODUCT_HARM_BLOCKLIST)) return { type: "blocked_product" };
  if (looksLikeSpam(rawText)) return { type: "spam" };

  return { type: "ok" };
}
