-- "Hướng dẫn sử dụng", per product, written in the same rich editor as the
-- description and the feature note.
--
-- Nullable with no backfill: NULL prints the one sentence every tool printed
-- when this block was written into the page, so nothing on the storefront
-- changes until a shop writes a guide for a product.
ALTER TABLE "products" ADD COLUMN "guide" TEXT;
