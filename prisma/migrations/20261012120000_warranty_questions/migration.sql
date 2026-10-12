-- The second round of a warranty report asks questions the shop can now
-- write per game (category) or per product; null inherits, down to the
-- default set in src/lib/warrantyDetails.ts.
ALTER TABLE "categories" ADD COLUMN "warrantyQuestions" JSONB;
ALTER TABLE "products" ADD COLUMN "warrantyQuestions" JSONB;
