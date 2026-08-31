-- A product-scoped voucher now names any number of products ("những sản
-- phẩm chỉ định") instead of exactly one. Existing single links move into
-- the join table before the old column goes; a product removed later just
-- drops out of the list.
CREATE TABLE "voucher_products" (
    "voucherId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,

    CONSTRAINT "voucher_products_pkey" PRIMARY KEY ("voucherId", "productId")
);

CREATE INDEX "voucher_products_productId_idx" ON "voucher_products"("productId");

ALTER TABLE "voucher_products" ADD CONSTRAINT "voucher_products_voucherId_fkey"
    FOREIGN KEY ("voucherId") REFERENCES "vouchers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "voucher_products" ADD CONSTRAINT "voucher_products_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "voucher_products" ("voucherId", "productId")
SELECT "id", "productId" FROM "vouchers" WHERE "productId" IS NOT NULL;

ALTER TABLE "vouchers" DROP CONSTRAINT "vouchers_productId_fkey";
DROP INDEX "vouchers_productId_idx";
ALTER TABLE "vouchers" DROP COLUMN "productId";
