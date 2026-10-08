-- Account orders placed before the receipt's "Lay thong tin" gate already
-- showed their sign-in, on the web and in the Telegram bot: count them as
-- taken at the moment of sale (the owner, 08/10/2026: "don cu la da nhan r").
-- Only rows still unstamped, so a take recorded since is kept.
UPDATE "orders" AS o
SET "loginRevealedAt" = o."createdAt"
FROM "products" AS p
WHERE p."id" = o."productId"
  AND p."productType" = 'ACCOUNT_GAME'
  AND o."loginRevealedAt" IS NULL;
