-- A discount code as a prize. The wheel mints one per win rather than handing
-- out a shared code: a code passed round a Discord server is a price cut, not
-- a prize. `voucherDays` is how long the minted code lasts.
ALTER TABLE "spin_prizes" ADD COLUMN "voucherDays" INTEGER;
ALTER TABLE "spin_wins" ADD COLUMN "voucherCode" TEXT;
