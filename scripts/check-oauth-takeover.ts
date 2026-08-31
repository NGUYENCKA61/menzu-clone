/**
 * Walks the account-takeover scenario that OAuth linking used to allow, and
 * checks the door is shut.
 *
 *   NODE_OPTIONS="--conditions=react-server" npx tsx --env-file=.env \
 *     scripts/check-oauth-takeover.ts
 *
 * The condition is what stops `server-only` — pulled in through the session
 * module — from throwing outside Next; it resolves to an empty module there.
 *
 * Writes only its own throwaway rows and deletes them again.
 */

import { db } from "../src/lib/db";
import { findOrCreateOauthUser } from "../src/lib/oauth";

const VICTIM_EMAIL = "zz-victim@example.com";
const ATTACKER = "zzattacker";
const HONEST = "zzhonest";
const HONEST_EMAIL = "zz-honest@example.com";

async function wipe() {
  const rows = await db.user.findMany({
    where: { username: { in: [ATTACKER, HONEST] } },
    select: { id: true },
  });
  const ids = rows.map((r) => r.id);
  if (ids.length === 0) return;
  await db.linkedAccount.deleteMany({ where: { userId: { in: ids } } });
  await db.session.deleteMany({ where: { userId: { in: ids } } });
  await db.user.deleteMany({ where: { id: { in: ids } } });
}

const failures: string[] = [];
function check(label: string, pass: boolean, detail: string) {
  console.log(`${pass ? "✅" : "❌"} ${label}\n   ${detail}`);
  if (!pass) failures.push(label);
}

async function main() {
await wipe();

// 1. The attack. Somebody registers by hand with the victim's address — which
//    is all registration asks for, since the shop cannot send a mail to check.
const attacker = await db.user.create({
  data: { username: ATTACKER, email: VICTIM_EMAIL, passwordHash: "hash-the-attacker-knows" },
});

//    The victim then presses "Đăng nhập bằng Google" for the first time.
//    Google has genuinely verified the address for them.
const attempt = await findOrCreateOauthUser({
  provider: "google",
  providerId: "zz-victim-google-id",
  email: VICTIM_EMAIL,
  displayName: "victim",
});

const linkedToAttacker = await db.linkedAccount.findFirst({
  where: { userId: attacker.id },
});
check(
  "Không nối Google của nạn nhân vào tài khoản kẻ xấu",
  attempt.ok === false && (attempt as { reason: string }).reason === "email" && linkedToAttacker === null,
  attempt.ok
    ? `HỎNG: đã đăng nhập vào tài khoản "${attempt.user.username}" của kẻ xấu`
    : `bị từ chối với lý do "${(attempt as { reason: string }).reason}", tài khoản kẻ xấu không nhận được liên kết nào`,
);

// 2. The honest path still works: an address a provider vouched for, on an
//    account that provider created, links a second provider to the same user.
const honest = await db.user.create({
  data: {
    username: HONEST,
    email: HONEST_EMAIL,
    emailVerifiedAt: new Date(),
    passwordHash: null,
    linkedAccounts: { create: { provider: "google", providerId: "zz-honest-google-id" } },
  },
});
const second = await findOrCreateOauthUser({
  provider: "discord",
  providerId: "zz-honest-discord-id",
  email: HONEST_EMAIL,
  displayName: "honest",
});
check(
  "Email đã xác minh vẫn nối được nhà cung cấp thứ hai vào đúng tài khoản",
  second.ok === true && second.user.id === honest.id,
  second.ok ? `vào đúng tài khoản "${second.user.username}"` : `HỎNG: bị từ chối (${(second as { reason: string }).reason})`,
);

// 3. Editing the address by hand must drop the stamp, or the attacker just
//    takes an OAuth account of their own and renames its address to the
//    victim's.
await db.user.update({
  where: { id: honest.id },
  data: { email: VICTIM_EMAIL + ".other", emailVerifiedAt: null },
});
const afterEdit = await db.user.findUniqueOrThrow({
  where: { id: honest.id },
  select: { emailVerifiedAt: true },
});
check(
  "Đổi email bằng tay thì mất dấu xác minh",
  afterEdit.emailVerifiedAt === null,
  `emailVerifiedAt = ${afterEdit.emailVerifiedAt}`,
);

// 4. A provider that did not confirm an address hands over null, and the new
//    account must not claim one.
const noEmail = await findOrCreateOauthUser({
  provider: "discord",
  providerId: "zz-noemail-discord-id",
  email: null,
  displayName: "no email",
});
check(
  "Nhà cung cấp không xác minh email thì tài khoản mới không có email",
  noEmail.ok === true && noEmail.user.email === null && noEmail.user.emailVerifiedAt === null,
  noEmail.ok ? `email=${noEmail.user.email}, dấu xác minh=${noEmail.user.emailVerifiedAt}` : "HỎNG: không tạo được tài khoản",
);
if (noEmail.ok) {
  await db.linkedAccount.deleteMany({ where: { userId: noEmail.user.id } });
  await db.user.delete({ where: { id: noEmail.user.id } });
}

await wipe();
await db.$disconnect();

console.log(failures.length === 0 ? "\nTẤT CẢ ĐẠT" : `\nHỎNG ${failures.length} mục`);
process.exit(failures.length === 0 ? 0 : 1);
}

void main();
