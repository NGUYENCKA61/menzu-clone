/**
 * Carriers whose prepaid cards the shop accepts.
 *
 * Drawn as the carriers' own marks, the way every top-up desk in the country
 * draws them: a customer holding a card matches the logo before the word.
 * Shared by the form that takes a card and the invoice that reports on it.
 */
export const CARRIERS = [
  // Measured off the files: the letters, not the drawing. Vinaphone pads its
  // canvas, Zing wraps its word in a badge and Garena stands a dragon next to
  // one, so a shared image height renders five different type sizes. These
  // heights put every wordmark at about 15px.
  { value: "Viettel", label: "Viettel", logo: "/images/carriers/viettel.svg", height: 16 },
  { value: "Vinaphone", label: "Vinaphone", logo: "/images/carriers/vinaphone.svg", height: 24 },
  { value: "Mobifone", label: "Mobifone", logo: "/images/carriers/mobifone.svg", height: 15 },
  { value: "Garena", label: "Garena", logo: "/images/carriers/garena.svg", height: 26 },
  { value: "Zing", label: "Zing", logo: "/images/carriers/zing.svg", height: 25 },
] as const;

export type Carrier = (typeof CARRIERS)[number];

/** The carrier a request names, or null for one this list does not know. */
export function carrierFor(value: string | null): Carrier | null {
  return CARRIERS.find((option) => option.value === value) ?? null;
}
