-- Package durations move from days to hours.
--
-- A tool sells by the hour as readily as by the month, and an INTEGER column
-- counting days cannot hold "3 giờ" at all. Written by hand rather than by the
-- schema differ so the tiers already on sale survive the change: every stored
-- day count becomes the same length in hours instead of being dropped with the
-- column.
ALTER TABLE "product_packages" ADD COLUMN "durationHours" INTEGER;

UPDATE "product_packages"
SET "durationHours" = "durationDays" * 24
WHERE "durationDays" IS NOT NULL;

ALTER TABLE "product_packages" DROP COLUMN "durationDays";
