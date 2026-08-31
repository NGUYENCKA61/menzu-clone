import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { SESSION_COOKIE } from "@/lib/auth";
import { AccountPageFrame } from "@/components/sites/menzu-lol-f7ae197a/shared/AccountPageFrame";
import { SecurityPanel } from "@/components/sites/menzu-lol-f7ae197a/shared/SecurityPanel";
import { db } from "@/lib/db";
import { describeUserAgent } from "@/lib/device";
import { getCurrentUser } from "@/lib/session";
import { discordOauthEnabled, googleOauthEnabled } from "@/lib/settings";
import { getShopSettings } from "@/lib/settingsStore";

export const metadata: Metadata = {
  title: "Bảo mật tài khoản",
  // Nothing here belongs in a search index: it is either a sign-in step or
  // one visitor's own account. Followed, not indexed, so the links still
  // pass through.
  robots: { index: false, follow: true },
};
export const dynamic = "force-dynamic";

const PROVIDER_NAMES: Record<string, string> = {
  google: "Google",
  discord: "Discord",
};

/** "13:34 - 21/08/2026", the shape the device row's second line reads in. */
function deviceWhen(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())} - ${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}

interface SecurityPageProps {
  searchParams: Promise<{ linked?: string; linkError?: string }>;
}

export default async function SecurityPage({ searchParams }: SecurityPageProps) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=%2Fsecurity");

  // Whether this account has a password at all. An OAuth-only account has
  // none, and the form must ask for a first one rather than for a current
  // one it can never be given.
  const passwordRow = await db.user.findUniqueOrThrow({
    where: { id: user.id },
    select: { passwordHash: true },
  });
  const hasPassword = passwordRow.passwordHash !== null;

  const [settings, linkedRows, sessions, store, query] = await Promise.all([
    getShopSettings(),
    db.linkedAccount.findMany({
      where: { userId: user.id },
      select: { provider: true },
    }),
    // Only sessions still alive: an expired row is a login that already
    // ended, and listing it would read as a device that still has access.
    db.session.findMany({
      where: { userId: user.id, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        createdAt: true,
        ip: true,
        userAgent: true,
        location: true,
      },
    }),
    cookies(),
    searchParams,
  ]);
  const token = store.get(SESSION_COOKIE)?.value ?? "";
  const linkedSet = new Set(linkedRows.map((row) => row.provider));

  // The OAuth callback lands back here with the outcome in the query; the
  // panel opens on the Liên kết tab and says it in words.
  const linkNotice =
    query.linked && PROVIDER_NAMES[query.linked]
      ? {
          tone: "ok" as const,
          text: `Đã liên kết ${PROVIDER_NAMES[query.linked]} vào tài khoản của bạn.`,
        }
      : query.linkError && PROVIDER_NAMES[query.linkError]
        ? {
            tone: "err" as const,
            text: `Tài khoản ${PROVIDER_NAMES[query.linkError]} này đang liên kết với một người dùng khác.`,
          }
        : null;

  return (
    <AccountPageFrame
      title="Bảo mật tài khoản"
      subtitle="Cập nhật thông tin đăng nhập và quản lý thiết bị"
      crumb="Bảo mật"
    >
      <SecurityPanel
        email={user.email}
        hasPassword={hasPassword}
        googleLinked={linkedSet.has("google")}
        discordLinked={linkedSet.has("discord")}
        googleEnabled={googleOauthEnabled(settings)}
        discordEnabled={discordOauthEnabled(settings)}
        initialTab={linkNotice ? "linked" : "security"}
        linkNotice={linkNotice}
        sessions={sessions.map((session) => ({
          // Never the token itself — it IS the login. The tail is enough to
          // tell rows apart on screen.
          key: session.id.slice(-6),
          device: describeUserAgent(session.userAgent),
          ip: session.ip,
          location: session.location,
          when: deviceWhen(session.createdAt),
          current: session.id === token,
        }))}
      />
    </AccountPageFrame>
  );
}
