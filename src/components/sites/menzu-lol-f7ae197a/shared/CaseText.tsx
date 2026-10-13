import { sentenceCase } from "@/lib/displayCase";

/**
 * A name as the admin typed it, with its sentence-case twin beside it for the
 * "moi" light dress (TRIAL, 14/10/2026; the owner: "đẹp hiện đại chuyên
 * nghiệp không có rối"). The twin carries Tailwind's `hidden`, so the dark
 * site, the ocean dress and the Nike trial draw exactly what they drew; only
 * html[data-variant="moi"] swaps the two (src/app/theme-light.css, part 6).
 * Whichever one is hidden is display:none, so a screen reader reads one name.
 *
 * A name that sentence case leaves as it is renders once, with no wrapper.
 * When a light dress ships for good this becomes a plain sentenceCase() call.
 */
export function CaseText({ text }: { text: string }) {
  const soft = sentenceCase(text);
  if (soft === text) return <>{text}</>;
  return (
    <>
      <span className="case-typed">{text}</span>
      <span className="case-soft hidden">{soft}</span>
    </>
  );
}
