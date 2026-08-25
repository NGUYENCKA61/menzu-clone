-- The reward wheel's receipts.
--
-- Points and money settle inside the spin's own transaction, so for those this
-- table is a record. A physical prize is why it exists: nothing in the account
-- can pay one out, so the row is what tells the shop there is a parcel to send.
CREATE TYPE "SpinWinStatus" AS ENUM ('NONE', 'PENDING', 'SENT');

CREATE TABLE "spin_wins" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "prizeId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "amount" INTEGER NOT NULL DEFAULT 0,
    "status" "SpinWinStatus" NOT NULL DEFAULT 'NONE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "spin_wins_pkey" PRIMARY KEY ("id")
);

-- The shop reads this table one way only: newest parcels still to send.
CREATE INDEX "spin_wins_status_createdAt_idx" ON "spin_wins"("status", "createdAt");
CREATE INDEX "spin_wins_userId_createdAt_idx" ON "spin_wins"("userId", "createdAt");

ALTER TABLE "spin_wins" ADD CONSTRAINT "spin_wins_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
