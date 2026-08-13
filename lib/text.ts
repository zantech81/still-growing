// Grapheme-aware helpers for reflection text, shared between client
// components (live character counter) and API routes (submit-time
// validation), so the two can never disagree about a string's length.
// A plain .length (UTF-16 code units) overcounts surrogate-pair and
// ZWJ-sequence emoji -- Intl.Segmenter with granularity "grapheme" counts
// what a user actually perceives as one character (e.g. a family or
// skin-toned emoji sequence as 1, not 5+).
export function graphemeLength(text: string): number {
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
    return Array.from(segmenter.segment(text)).length;
  }
  return Array.from(text).length;
}

// Inserts `insertion` at the textarea's current cursor position (replacing
// any active selection), rather than always appending to the end.
// Falls back to appending when there's no live textarea/selection to read
// (e.g. called before the ref is attached).
export function insertAtCursor(
  textarea: HTMLTextAreaElement | null,
  current: string,
  insertion: string
): { text: string; cursor: number } {
  const start = textarea?.selectionStart ?? current.length;
  const end = textarea?.selectionEnd ?? current.length;
  const text = current.slice(0, start) + insertion + current.slice(end);
  return { text, cursor: start + insertion.length };
}
