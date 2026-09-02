-- The courier's number, and whatever the shop wrote back with it. An address
-- collected and never answered leaves the winner with nothing to check.
ALTER TABLE "spin_wins" ADD COLUMN "tracking" TEXT;
ALTER TABLE "spin_wins" ADD COLUMN "shopNote" TEXT;
