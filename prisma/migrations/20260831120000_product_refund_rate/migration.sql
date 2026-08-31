-- How much of what a buyer paid comes back when the tool fails them, as a
-- whole percent. Nullable: null means the shop has not promised a figure yet,
-- and the policy block prints no line rather than inventing one.
ALTER TABLE "products" ADD COLUMN "refundRate" INTEGER;
