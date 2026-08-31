-- "Yêu cầu hệ thống", per product: the label/answer rows in the panel under
-- the description, stored as a JSON string the way `features` is — written
-- and read as a block, never queried one row at a time.
--
-- Nullable with no backfill: NULL prints the list every tool printed when
-- it was a constant in the page, so nothing on the storefront changes until
-- a shop writes a list for a product.
ALTER TABLE "products" ADD COLUMN "requirements" TEXT;
