import { randomBytes } from "node:crypto";

/**
 * The short human-facing codes on orders and wallet movements — DH8F3K2Q.
 *
 * Two things the old one-liner got wrong. `Math.random().toString(36)` drops
 * trailing zeroes, so it sometimes returned four or five characters instead of
 * six, and every character it lost halved the space; and the space it drew
 * from was a pseudo-random generator shared with everything else in the
 * process. A collision is not a security problem here — the column is unique,
 * so the write simply fails — but the customer saw "Không thể tạo đơn hàng"
 * for an order that was perfectly affordable, with nothing to suggest that
 * pressing the button again would work.
 *
 * So: crypto bytes, a fixed length, and an alphabet with no I/O/0/1 in it,
 * because these codes get read down a phone line to support.
 */
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const LENGTH = 8;

export function makeShortCode(prefix: string): string {
  // One byte per character, rejected down to a multiple of the alphabet so
  // the distribution stays flat rather than favouring the first 24 letters.
  const limit = Math.floor(256 / ALPHABET.length) * ALPHABET.length;
  let body = "";
  while (body.length < LENGTH) {
    for (const byte of randomBytes(LENGTH)) {
      if (byte >= limit) continue;
      body += ALPHABET[byte % ALPHABET.length];
      if (body.length === LENGTH) break;
    }
  }
  return `${prefix}${body}`;
}
