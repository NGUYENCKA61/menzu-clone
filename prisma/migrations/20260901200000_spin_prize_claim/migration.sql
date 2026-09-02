-- A won parcel needs somewhere to go, and a winner who does not want it needs
-- a way out. The address is collected after the wheel stops rather than at
-- sign-up: most customers never win one, and an address taken from everybody
-- to serve the few is a database of home addresses the shop did not need.
ALTER TYPE "SpinWinStatus" ADD VALUE 'EXCHANGED';

ALTER TABLE "spin_prizes" ADD COLUMN "exchangePoints" INTEGER;

ALTER TABLE "spin_wins" ADD COLUMN "recipient" TEXT;
ALTER TABLE "spin_wins" ADD COLUMN "phone" TEXT;
ALTER TABLE "spin_wins" ADD COLUMN "address" TEXT;
ALTER TABLE "spin_wins" ADD COLUMN "note" TEXT;
ALTER TABLE "spin_wins" ADD COLUMN "pointsBack" INTEGER;
