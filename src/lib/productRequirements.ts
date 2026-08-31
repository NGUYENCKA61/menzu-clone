/**
 * "Yêu cầu hệ thống" — the label/answer list on a tool's page, per product.
 *
 * Stored the way the feature list is: a JSON string in one column, written
 * and read as a block. A product that has not been given its own list falls
 * back to DEFAULT_REQUIREMENTS, which is the list every tool printed when
 * this was a constant in the component — nothing on the storefront goes
 * blank because a shop has not got round to a product yet.
 */

export interface ProductRequirement {
  label: string;
  value: string;
}

/** What every tool said before the list could be edited — the shop's own
 *  wording, spacing and "!" included. */
export const DEFAULT_REQUIREMENTS: readonly ProductRequirement[] = [
  { label: "Hỗ trợ", value: "Windows 10, 11 Net nhà" },
  {
    label: "Yêu cầu thêm",
    value: "UEFI bios,enable virtualization,disable secure boot",
  },
  { label: "CPU hỗ trợ", value: "Intel and AMD with AVX" },
  { label: "Thiết lập màn hình", value: "Không viền !" },
  { label: "Nền tảng", value: "Steam" },
];

/** Past this the panel stops being a checklist and becomes a spec sheet. */
export const REQUIREMENT_MAX = 12;
export const REQUIREMENT_LABEL_MAX = 60;
export const REQUIREMENT_VALUE_MAX = 200;

/**
 * One row, or null if it is not one.
 *
 * Unlike a feature, a requirement needs both halves: a label with no answer
 * is an empty cell on the right, and an answer with no label is a cell that
 * does not say what it is answering.
 */
export function toRequirement(value: unknown): ProductRequirement | null {
  const row = value as { label?: unknown; value?: unknown } | null;
  const label = String(row?.label ?? "").trim();
  const answer = String(row?.value ?? "").trim();
  if (!label || !answer) return null;
  return {
    label: label.slice(0, REQUIREMENT_LABEL_MAX),
    value: answer.slice(0, REQUIREMENT_VALUE_MAX),
  };
}

/** Cleans a list on its way into the database. */
export function sanitizeRequirements(value: unknown): ProductRequirement[] {
  if (!Array.isArray(value)) return [];
  return value
    .map(toRequirement)
    .filter((r): r is ProductRequirement => r !== null)
    .slice(0, REQUIREMENT_MAX);
}

/**
 * Reads the stored column. Anything unparseable reads as "not set", which the
 * caller turns into the defaults — a corrupt row must not blank a live page.
 */
export function parseRequirements(
  raw: string | null | undefined,
): ProductRequirement[] {
  if (!raw) return [];
  try {
    return sanitizeRequirements(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function serializeRequirements(
  requirements: ProductRequirement[],
): string | null {
  const clean = sanitizeRequirements(requirements);
  // Null rather than "[]": an empty list means the product has none of its
  // own, which is exactly what an unset column already says.
  return clean.length > 0 ? JSON.stringify(clean) : null;
}

/** What the page draws: the product's own list, or the shop's default one. */
export function requirementsOrDefault(
  requirements: ProductRequirement[],
): readonly ProductRequirement[] {
  return requirements.length > 0 ? requirements : DEFAULT_REQUIREMENTS;
}

/**
 * One requirement per line, "Nhãn: giá trị" — the shape the desk types in.
 *
 * Split at the FIRST colon, so an answer may contain more of them
 * ("Yêu cầu thêm: UEFI bios, secure boot: tắt"). A line with no colon has
 * no answer and is dropped — see toRequirement.
 */
export function parseRequirementLines(text: string): ProductRequirement[] {
  return sanitizeRequirements(
    text.split(/\r?\n/).map((line) => {
      const at = line.indexOf(":");
      return at === -1
        ? { label: line, value: "" }
        : { label: line.slice(0, at), value: line.slice(at + 1) };
    }),
  );
}

/** The same list back as text, for the box to open with. */
export function requirementsToLines(
  requirements: ProductRequirement[],
): string {
  return requirements.map((r) => `${r.label}: ${r.value}`).join("\n");
}
