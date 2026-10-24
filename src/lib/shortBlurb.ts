/**
 * A card's blurb, cut short (the owner, 24/10/2026: "cắt mô tả ngắn hơn để
 * '...' xuất hiện sớm hơn"). Past `max` characters it stops at the last whole
 * word that fits and closes with "…", so on a desktop card the dots land
 * partway along the second line instead of wherever the line clamp runs out
 * of room. Punctuation left before the dots goes: "11.…" reads as a typo.
 */
export function shortBlurb(text: string, max = 100): string {
  const flat = text.replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  // One character past the limit, so a space sitting right at it still
  // counts as a place to stop.
  const head = flat.slice(0, max + 1);
  const space = head.lastIndexOf(" ");
  const cut = space > max * 0.6 ? head.slice(0, space) : flat.slice(0, max);
  return `${cut.replace(/[\s.,;:!?-]+$/u, "")}…`;
}
