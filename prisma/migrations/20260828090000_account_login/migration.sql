-- A sold account has to come with a way in.
--
-- The sign-in lives on the product because the product is the account: one
-- row, one username, one password. An order reads it through the join it
-- already uses for the code and the picture, so a shop that lists first and
-- types the sign-in later has nothing to re-attach — the buyer's order page
-- simply starts showing it. Nullable so every row that exists keeps meaning
-- what it did; the storefront never selects these three.
ALTER TABLE "products"
  ADD COLUMN "loginUsername" TEXT,
  ADD COLUMN "loginPassword" TEXT,
  ADD COLUMN "loginNote" TEXT;
