-- The stock room behind "Giao key tự động".
--
-- Keys hang off the tier, not the product: an hour of a tool and a lifetime of
-- it are different goods with different stock. A sold key keeps its row for as
-- long as the order does — it is the receipt for what the buyer was handed,
-- and its expiresAt is the only record of when their access stops.
CREATE TYPE "LicenseKeyStatus" AS ENUM ('AVAILABLE', 'SOLD', 'DISABLED');

CREATE TABLE "license_keys" (
    "id" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "status" "LicenseKeyStatus" NOT NULL DEFAULT 'AVAILABLE',
    "note" TEXT,
    "orderId" TEXT,
    "userId" TEXT,
    "deliveredAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "license_keys_pkey" PRIMARY KEY ("id")
);

-- Pasting the same batch twice is a double-click, not twice the stock.
CREATE UNIQUE INDEX "license_keys_packageId_value_key" ON "license_keys"("packageId", "value");

-- The one read that has to be fast: this tier's shelf, oldest key first, which
-- is the order a sale takes them in.
CREATE INDEX "license_keys_packageId_status_createdAt_idx" ON "license_keys"("packageId", "status", "createdAt");
CREATE INDEX "license_keys_orderId_idx" ON "license_keys"("orderId");

-- A tier can only be deleted while nothing has sold it, so its unsold stock
-- goes with it.
ALTER TABLE "license_keys" ADD CONSTRAINT "license_keys_packageId_fkey"
    FOREIGN KEY ("packageId") REFERENCES "product_packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- The buyer and the order are how a key is traced, but neither may hold a
-- delivered key hostage: if one is ever removed the key stays, orphaned and
-- readable, rather than blocking the delete or vanishing with it.
ALTER TABLE "license_keys" ADD CONSTRAINT "license_keys_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "license_keys" ADD CONSTRAINT "license_keys_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
