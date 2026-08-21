-- AlterTable
ALTER TABLE "users" ADD COLUMN     "commissionBalance" BIGINT NOT NULL DEFAULT 0,
ADD COLUMN     "referredById" TEXT;

-- CreateTable
CREATE TABLE "referral_earnings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "topUpId" TEXT NOT NULL,
    "amount" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "referral_earnings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "referral_earnings_topUpId_key" ON "referral_earnings"("topUpId");

-- CreateIndex
CREATE INDEX "referral_earnings_userId_createdAt_idx" ON "referral_earnings"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_referredById_fkey" FOREIGN KEY ("referredById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_earnings" ADD CONSTRAINT "referral_earnings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_earnings" ADD CONSTRAINT "referral_earnings_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_earnings" ADD CONSTRAINT "referral_earnings_topUpId_fkey" FOREIGN KEY ("topUpId") REFERENCES "topups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
