/**
 * End-to-end check of the purchase path, against the running dev server.
 *
 *   node scripts/verify-purchase.mjs [origin]
 *
 * The schema has changed repeatedly since this flow was last exercised, and a
 * passing build proves nothing about it: the transaction that debits a wallet,
 * marks stock sold and writes the ledger either holds together or quietly
 * charges someone for an account they do not receive.
 *
 * Creates a throwaway account, credits it directly in the database, buys a
 * real product through the HTTP API, asserts every side effect, then removes
 * everything it made — including restoring the product to AVAILABLE, so the
 * catalogue is exactly as it was.
 */
import { randomBytes } from "node:crypto";

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const ORIGIN = process.argv[2] ?? "http://localhost:3100";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const username = `e2e_${randomBytes(4).toString("hex")}`;
// Throwaway credential for a throwaway account, never reused or stored.
const password = randomBytes(18).toString("base64url");

let passed = 0;
const failures = [];

function check(label, condition, detail = "") {
  if (condition) {
    passed += 1;
    console.log(`  ok    ${label}`);
  } else {
    failures.push(`${label}${detail ? ` — ${detail}` : ""}`);
    console.log(`  FAIL  ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

async function main() {
  const product = await db.product.findFirst({
    where: { status: "AVAILABLE" },
    orderBy: { price: "asc" },
    select: { code: true, price: true },
  });
  if (!product) throw new Error("no AVAILABLE product to test with");

  const price = Number(product.price);
  const startingBalance = price + 50_000;
  console.log(`product ${product.code} at ${price.toLocaleString("vi-VN")}đ\n`);

  // --- register -----------------------------------------------------------
  const registerResponse = await fetch(`${ORIGIN}/api/auth/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  check("register returns 200", registerResponse.ok, `got ${registerResponse.status}`);

  const cookie = registerResponse.headers.get("set-cookie")?.split(";")[0] ?? "";
  check("register sets a session cookie", cookie.startsWith("menzu_session="));

  const user = await db.user.findUnique({ where: { username } });
  if (!user) throw new Error("user was not created");
  // Compared field by field rather than by stringifying the row: balances are
  // BigInt and JSON.stringify throws on them, which would have turned this
  // assertion into a crash instead of a check.
  check(
    "password is not stored in plaintext",
    !Object.values(user).some((value) => typeof value === "string" && value.includes(password)),
  );
  check("password hash is scrypt", user.passwordHash.startsWith("scrypt$"));

  await db.user.update({ where: { id: user.id }, data: { balance: BigInt(startingBalance) } });

  // --- buy with too little money -----------------------------------------
  await db.user.update({ where: { id: user.id }, data: { balance: BigInt(price - 1) } });
  const poorResponse = await fetch(`${ORIGIN}/api/orders`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie },
    body: JSON.stringify({ code: product.code }),
  });
  check("purchase is refused when the balance is one đồng short", !poorResponse.ok,
    `got ${poorResponse.status}`);

  const stillAvailable = await db.product.findUnique({ where: { code: product.code } });
  check("refused purchase leaves stock AVAILABLE", stillAvailable?.status === "AVAILABLE",
    stillAvailable?.status);

  // --- buy properly -------------------------------------------------------
  await db.user.update({ where: { id: user.id }, data: { balance: BigInt(startingBalance) } });
  const buyResponse = await fetch(`${ORIGIN}/api/orders`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie },
    body: JSON.stringify({ code: product.code }),
  });
  check("purchase returns 200", buyResponse.ok, `got ${buyResponse.status}`);

  const after = await db.user.findUnique({ where: { id: user.id } });
  check("balance is debited by exactly the price",
    Number(after?.balance) === startingBalance - price,
    `${Number(after?.balance)} vs ${startingBalance - price}`);

  const sold = await db.product.findUnique({ where: { code: product.code } });
  check("product is marked SOLD", sold?.status === "SOLD", sold?.status);

  const order = await db.order.findFirst({ where: { userId: user.id } });
  check("an order row exists", Boolean(order));
  check("order total matches the price", Number(order?.total) === price);

  const ledger = await db.transaction.findFirst({ where: { userId: user.id } });
  check("a ledger row exists", Boolean(ledger));
  check("ledger delta is the negative price", Number(ledger?.delta) === -price,
    String(Number(ledger?.delta)));
  check("ledger balanceAfter matches the wallet",
    Number(ledger?.balanceAfter) === startingBalance - price);

  // --- double-sell --------------------------------------------------------
  await db.user.update({ where: { id: user.id }, data: { balance: BigInt(startingBalance) } });
  const secondResponse = await fetch(`${ORIGIN}/api/orders`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie },
    body: JSON.stringify({ code: product.code }),
  });
  check("the same account cannot be sold twice", !secondResponse.ok,
    `got ${secondResponse.status}`);

  const untouched = await db.user.findUnique({ where: { id: user.id } });
  check("the refused second purchase debits nothing",
    Number(untouched?.balance) === startingBalance);

  // --- guest --------------------------------------------------------------
  const guestResponse = await fetch(`${ORIGIN}/api/orders`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ code: product.code }),
  });
  check("a signed-out request is rejected", guestResponse.status === 401,
    `got ${guestResponse.status}`);
}

async function cleanup() {
  const user = await db.user.findUnique({ where: { username } });
  if (!user) return;

  const orders = await db.order.findMany({ where: { userId: user.id } });
  for (const order of orders) {
    await db.product.update({ where: { id: order.productId }, data: { status: "AVAILABLE" } });
  }
  await db.order.deleteMany({ where: { userId: user.id } });
  await db.transaction.deleteMany({ where: { userId: user.id } });
  await db.session.deleteMany({ where: { userId: user.id } });
  await db.authAttempt.deleteMany({ where: { identifier: username.toLowerCase() } });
  await db.user.delete({ where: { id: user.id } });
  console.log("\ncleaned up test user, orders and stock");
}

main()
  .catch((error) => {
    console.error(`\nERROR: ${error.message}`);
    failures.push(error.message);
  })
  .finally(async () => {
    await cleanup().catch((error) => console.error(`cleanup failed: ${error.message}`));
    console.log(`\n${passed} passed, ${failures.length} failed`);
    for (const failure of failures) console.log(`  ${failure}`);
    await db.$disconnect();
    process.exit(failures.length ? 1 : 0);
  });
