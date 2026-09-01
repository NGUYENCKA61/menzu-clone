-- Whether the detection pill shows on the product's own page. NULL keeps the
-- decision with the badges: pill hidden where a badge already speaks for the
-- tool, shown where none does. Every existing row starts there.
ALTER TABLE "products" ADD COLUMN "showStatus" BOOLEAN;
