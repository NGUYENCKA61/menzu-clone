-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "WarrantyStatus" ADD VALUE 'REFUNDING';
ALTER TYPE "WarrantyStatus" ADD VALUE 'REFUNDED';

-- AlterTable
ALTER TABLE "warranty_requests" ADD COLUMN     "accountHolder" TEXT,
ADD COLUMN     "bankAccount" TEXT,
ADD COLUMN     "bankName" TEXT,
ADD COLUMN     "bankSubmittedAt" TIMESTAMP(3),
ADD COLUMN     "refundAmount" BIGINT,
ADD COLUMN     "refundMethod" "RefundMethod";
