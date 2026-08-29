-- The write-up under "Tính năng nổi bật", per product.
--
-- Its own column rather than more rows in `features`: that list is one line
-- per feature and is parsed back out of "Tên: mô tả", while this is free prose
-- from the same rich editor the description uses — headings, bold, pictures.
-- Folding them together would mean one of the two losing its shape.
--
-- Nullable with no backfill: NULL draws nothing after the bullets, which is
-- exactly what every product does today.
ALTER TABLE "products" ADD COLUMN "featuresNote" TEXT;
