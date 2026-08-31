/**
 * Reading a text field out of a JSON body that nobody has checked.
 *
 * `body?.identifier?.trim()` assumes the caller sent a string. Send
 * `{"identifier": 123}` and `.trim` is not a function, which surfaced as a 500
 * and a stack in the log for what is really a malformed request — and a 500
 * tells a caller to retry, which this one should not.
 *
 * Anything that is not a string reads as absent. Not coerced: `String(123)`
 * would turn a mistake into a username, and a number that becomes "[object
 * Object]" is worse than nothing at all.
 */
export function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/** The same, trimmed — the shape almost every caller wants. */
export function trimmed(value: unknown): string {
  return text(value).trim();
}
