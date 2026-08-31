-- What a voucher may be spent on: everything (the default, and what every
-- existing code keeps), one category, or one product. The target is a
-- nullable link; a category or product removed later just widens the code
-- back to "nothing matches" — it never breaks the row.
CREATE TYPE "VoucherScope" AS ENUM ('ALL', 'CATEGORY', 'PRODUCT');

ALTER TABLE "vouchers" ADD COLUMN "scope" "VoucherScope" NOT NULL DEFAULT 'ALL';
ALTER TABLE "vouchers" ADD COLUMN "categoryId" TEXT;
ALTER TABLE "vouchers" ADD COLUMN "productId" TEXT;

CREATE INDEX "vouchers_categoryId_idx" ON "vouchers"("categoryId");
CREATE INDEX "vouchers_productId_idx" ON "vouchers"("productId");

ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_categoryId_fkey"
    FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
