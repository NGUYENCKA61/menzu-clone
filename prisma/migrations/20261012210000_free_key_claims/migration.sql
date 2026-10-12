-- A free tool's key, earned by passing the shop's paid shortlink (the owner,
-- 12/10/2026): one ticket per press of "Lay key", its id the secret the
-- shortlink leads to; claimed once, into an order like any other.
CREATE TABLE "free_key_claims" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "shortUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "claimedAt" TIMESTAMP(3),
    "orderId" TEXT,
    CONSTRAINT "free_key_claims_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "free_key_claims_orderId_key" ON "free_key_claims"("orderId");
CREATE INDEX "free_key_claims_userId_productId_createdAt_idx" ON "free_key_claims"("userId", "productId", "createdAt");
ALTER TABLE "free_key_claims" ADD CONSTRAINT "free_key_claims_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "free_key_claims" ADD CONSTRAINT "free_key_claims_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "free_key_claims" ADD CONSTRAINT "free_key_claims_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
