/**
 * TOTP code generation (RFC 6238), used by the /2fa tool.
 *
 * Deliberately free of Node built-ins: it runs on Web Crypto, which exists in
 * both the browser and Node 26. That lets the page compute codes entirely
 * client-side, so a Riot 2FA secret never leaves the visitor's machine — the
 * server has nothing to log, leak, or be subpoenaed for.
 */

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/** Seconds each code stays valid. Riot, like almost everyone, uses 30. */
export const TOTP_PERIOD = 30;

export class InvalidSecretError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidSecretError";
  }
}

/**
 * Decodes a base32 secret.
 *
 * Authenticator secrets are habitually shown in lowercase and in space- or
 * dash-separated groups, and pasted with the padding still attached, so all of
 * that is normalised away before validating.
 */
export function base32Decode(secret: string): Uint8Array {
  const cleaned = secret.replace(/[\s-]/g, "").replace(/=+$/, "").toUpperCase();
  if (cleaned.length === 0) throw new InvalidSecretError("Secret key trống");

  let bits = 0;
  let value = 0;
  let index = 0;
  const output = new Uint8Array(Math.floor((cleaned.length * 5) / 8));

  for (const char of cleaned) {
    const position = BASE32_ALPHABET.indexOf(char);
    if (position === -1) {
      throw new InvalidSecretError(`Ký tự không hợp lệ trong secret key: "${char}"`);
    }
    value = (value << 5) | position;
    bits += 5;
    if (bits >= 8) {
      output[index++] = (value >>> (bits - 8)) & 0xff;
      bits -= 8;
    }
  }

  return output.subarray(0, index);
}

/**
 * Generates the code for a given moment.
 *
 * `timeMs` is injectable so tests can pin the clock to the RFC's published
 * vectors instead of racing the real one.
 */
export async function generateTotp(
  secret: string,
  timeMs: number = Date.now(),
  digits = 6,
): Promise<string> {
  const key = base32Decode(secret);
  const counter = Math.floor(timeMs / 1000 / TOTP_PERIOD);

  // The counter is a 64-bit big-endian integer. Written as two 32-bit halves
  // because a plain `<<` in JS would truncate to 32 bits and silently break
  // every code after January 2038.
  const message = new ArrayBuffer(8);
  const view = new DataView(message);
  view.setUint32(0, Math.floor(counter / 2 ** 32));
  view.setUint32(4, counter >>> 0);

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key as BufferSource,
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", cryptoKey, message));

  // Dynamic truncation: the low nibble of the last byte picks the offset.
  const offset = mac[mac.length - 1]! & 0x0f;
  const binary =
    ((mac[offset]! & 0x7f) << 24) |
    ((mac[offset + 1]! & 0xff) << 16) |
    ((mac[offset + 2]! & 0xff) << 8) |
    (mac[offset + 3]! & 0xff);

  return (binary % 10 ** digits).toString().padStart(digits, "0");
}

/** Seconds until the current code expires. */
export function secondsRemaining(timeMs: number = Date.now()): number {
  return TOTP_PERIOD - (Math.floor(timeMs / 1000) % TOTP_PERIOD);
}
