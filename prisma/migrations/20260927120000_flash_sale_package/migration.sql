-- A flash sale on a tool names the tier it discounts.
--
-- A tool is sold by the tier the buyer picks (three hours, thirty days,
-- lifetime), so a sale carrying one figure and no tier had nothing to apply
-- to, and the scheduling endpoint refused tools outright. The sale now
-- carries the tier, and its salePrice is that tier's price while the sale
-- runs. NULL for an account, which has one price of its own.
--
-- Cascades with the tier: a sale on a tier the shop has deleted discounts
-- nothing, and keeping the row would only leave a dead line in the list.
ALTER TABLE "flash_sales" ADD COLUMN "packageId" TEXT;

CREATE INDEX "flash_sales_packageId_idx" ON "flash_sales"("packageId");

ALTER TABLE "flash_sales" ADD CONSTRAINT "flash_sales_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "product_packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
