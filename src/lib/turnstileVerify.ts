import "server-only";

import {
  readVerifyResponse,
  VERIFY_URL,
  type VerifyOutcome,
} from "@/lib/turnstile";

/**
 * Asks Cloudflare whether a token is genuine.
 *
 * The remote IP goes along when it is known: Cloudflare uses it to spot one
 * token being replayed from somewhere else. Best-effort, because it comes from
 * a proxy header — a missing one weakens the check slightly, a wrong one would
 * fail an honest visitor, so it is only sent when present.
 *
 * A network failure is a failure, not a pass. The alternative — letting logins
 * through whenever Cloudflare is unreachable — means the protection is off at
 * exactly the moment somebody is hammering the endpoint hard enough to matter.
 */
export async function verifyTurnstile(
  token: string,
  secret: string,
  remoteIp?: string | null,
): Promise<VerifyOutcome> {
  if (!token) return { ok: false, codes: ["missing-input-response"] };

  const form = new URLSearchParams({ secret, response: token });
  if (remoteIp) form.set("remoteip", remoteIp);

  try {
    const response = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: form,
      cache: "no-store",
      // Somebody is waiting on a sign-in button. Cloudflare answering slowly
      // must not hold the request open indefinitely.
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return { ok: false, codes: [`http-${response.status}`] };
    return readVerifyResponse(await response.json());
  } catch {
    return { ok: false, codes: ["network"] };
  }
}
