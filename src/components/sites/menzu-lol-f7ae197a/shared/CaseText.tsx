import { sentenceCase } from "@/lib/displayCase";

/**
 * A name as the admin typed it, carrying its sentence-case form in data-soft
 * for the "moi" light dress (TRIAL, 14/10/2026; the owner: "đẹp hiện đại
 * chuyên nghiệp không có rối"). The dark site, the ocean dress and the Nike
 * trial draw the typed name; only html[data-variant="moi"] hides it and draws
 * data-soft in its place (src/app/theme-light.css, part 6). The name is in the
 * page text once, so search engines and copy-paste see one title, not two.
 *
 * A name that sentence case leaves as it is renders once, with no wrapper.
 * When a light dress ships for good this becomes a plain sentenceCase() call.
 */
export function CaseText({ text }: { text: string }) {
  // LAB (Launcher): every name prints in sentence case on the dark site too,
  // acronyms kept (displayCase); the typed name stays in the database.
  return <>{sentenceCase(text)}</>;
}
