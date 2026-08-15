// Single source of truth for moderation rejection copy, shared by every
// route that runs a reflection's text through moderateReflection()
// (create, edit, and the visibility toggle). Keeping these in one place is
// what actually guarantees "the same rejection message as a new
// submission" rather than three call sites drifting apart over time.
export const CONTACT_INFO_MESSAGE =
  "No links, emails, or phone numbers, please. This is a space for your own reflection.";
export const HARMFUL_MESSAGE = "Let's keep this space kind. Please rewrite your reflection.";
export const CHAPTER_PASSWORD_MESSAGE =
  "No chapter passwords, please. This is a space for your own reflection.";
export const SPAM_MESSAGE =
  "This reads like spam to our filters and can't be shared to the Circle right now.";

export function productFeedbackMessage(): string {
  const supportEmail = process.env.SUPPORT_EMAIL ?? "support@stillgrowing.co";
  return `This sounds like feedback about Still Growing itself rather than a reflection on this chapter. We'd love to hear it. Email us at ${supportEmail}.`;
}

// Deliberately not accusatory ("we couldn't post this" states a plain
// fact, not a judgment) and always pairs the "why" with somewhere real to
// go: an international crisis-line directory plus a direct human email,
// so this is never just a dead end.
export function selfHarmMessage(): string {
  const supportEmail = process.env.SUPPORT_EMAIL ?? "support@stillgrowing.co";
  return `We couldn't post this. The Circle needs to stay a safe space for everyone here. But we want you to know: your life is valuable, and you don't have to carry this alone. Befrienders Worldwide (befrienders.org) can connect you with a crisis line in your country, any time, or you can email us directly at ${supportEmail}. We're glad you're here.`;
}
