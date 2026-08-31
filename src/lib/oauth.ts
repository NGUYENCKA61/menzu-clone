import "server-only";

import { randomBytes } from "node:crypto";

import { db } from "@/lib/db";
import { safeNext } from "@/lib/safeNext";

/**
 * The shared half of "Đăng nhập bằng Google/Discord": state handling and the
 * find-or-create that turns a provider profile into a signed-in shop user.
 *
 * The provider-specific halves — URLs, scopes, response shapes — live in the
 * two route folders, because that is exactly what differs between them.
 */

/** CSRF guard for the OAuth round trip; also carries the ?next= target. */
export const OAUTH_STATE_COOKIE = "menzu_oauth_state";

export interface OauthState {
  state: string;
  next: string;
}

export function newOauthState(next: string | null): OauthState {
  return {
    state: randomBytes(16).toString("hex"),
    // Same rule as the login form, and the same reason: "starts with a slash"
    // let //evil.com through, which a browser reads as another site.
    next: safeNext(next),
  };
}

/** The cookie payload — state and target in one, checked as one. */
export function encodeState(value: OauthState): string {
  return `${value.state}:${value.next}`;
}

export function decodeState(raw: string | undefined): OauthState | null {
  if (!raw) return null;
  const split = raw.indexOf(":");
  if (split < 1) return null;
  // Checked again on the way back in, not only on the way out: the cookie is
  // the attacker's own browser's, and the callback redirects to whatever it
  // says.
  return { state: raw.slice(0, split), next: safeNext(raw.slice(split + 1)) };
}

/** What the callback needs from any provider, whatever it calls the fields. */
export interface OauthProfile {
  provider: "google" | "discord";
  providerId: string;
  /** Only trusted when the provider says it verified it. */
  email: string | null;
  /** Something to build a username from. */
  displayName: string;
}

/** Either the account this identity belongs in, or why it gets none. */
export type OauthResolution =
  | { ok: true; user: Awaited<ReturnType<typeof db.user.findUniqueOrThrow>> }
  | { ok: false; reason: "blocked" | "email" };

/**
 * Provider profile in, shop user out.
 *
 * Three doors, tried in order:
 *  1. This provider identity has signed in before — its LinkedAccount row
 *     points at the user.
 *  2. The provider vouches for an address that an account already owns AND
 *     that account's address is itself verified — the identity is linked to
 *     it, so a customer who first arrived by Google can press Discord later
 *     and land in the same account.
 *  3. Nobody — a fresh user is created with no password; the provider is
 *     their way in until they set one.
 *
 * Door 2 turns on `emailVerifiedAt` and not on the address alone, because an
 * address alone proves nothing about who typed it. Without that test, anyone
 * could register (or edit their address) to their victim's, sit back, and be
 * handed the account the first time the victim pressed the Google button —
 * with the victim topping up a wallet the attacker still holds the password
 * to. An address that nobody vouched for now sends the visitor back to the
 * form with something to do about it, rather than into a stranger's account.
 */
export async function findOrCreateOauthUser(
  profile: OauthProfile,
): Promise<OauthResolution> {
  const linked = await db.linkedAccount.findUnique({
    where: {
      provider_providerId: {
        provider: profile.provider,
        providerId: profile.providerId,
      },
    },
    include: { user: true },
  });
  if (linked) {
    return linked.user.blockedAt
      ? { ok: false, reason: "blocked" }
      : { ok: true, user: linked.user };
  }

  if (profile.email) {
    const byEmail = await db.user.findUnique({ where: { email: profile.email } });
    if (byEmail) {
      if (byEmail.blockedAt) return { ok: false, reason: "blocked" };
      // Held by somebody whose address was never confirmed: this is where the
      // takeover would happen, so it stops here. Not a silent duplicate
      // account either — the address is unique, and a second one carrying it
      // could not be written anyway.
      if (byEmail.emailVerifiedAt === null) return { ok: false, reason: "email" };
      await db.linkedAccount.create({
        data: {
          userId: byEmail.id,
          provider: profile.provider,
          providerId: profile.providerId,
        },
      });
      return { ok: true, user: byEmail };
    }
  }

  const user = await db.user.create({
    data: {
      username: await freeUsername(profile.displayName, profile.email),
      email: profile.email,
      // The address arrived with the provider's word behind it — the callback
      // drops anything the provider had not confirmed before calling here.
      emailVerifiedAt: profile.email ? new Date() : null,
      passwordHash: null,
      // No avatar copied over: the provider hands a URL on its own CDN, and
      // this shop's next/image serves no foreign hosts — storing it took the
      // whole header down (500) for every OAuth user. The letter fallback
      // stands in until they upload one.
      linkedAccounts: {
        create: { provider: profile.provider, providerId: profile.providerId },
      },
    },
  });
  return { ok: true, user };
}

/**
 * A username the table does not hold yet, grown from what the provider knows.
 *
 * Lowercased, stripped to the shop's alphabet, and suffixed with digits until
 * unique — three tries of random suffixes on a shop this size will not
 * collide twice, and the loop is bounded either way.
 */
async function freeUsername(displayName: string, email: string | null): Promise<string> {
  const seed =
    (email?.split("@")[0] ?? displayName)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9_.]/g, "")
      .slice(0, 20) || "user";

  const base = seed.length >= 3 ? seed : `${seed}user`;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidate =
      attempt === 0 ? base : `${base}${Math.floor(1000 + Math.random() * 9000)}`;
    const taken = await db.user.findUnique({ where: { username: candidate } });
    if (!taken) return candidate;
  }
  return `${base}${Date.now() % 1000000}`;
}
