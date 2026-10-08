-- AlterEnum
ALTER TYPE "WarrantyIssue" ADD VALUE 'ACC_WRONG_LOGIN';
ALTER TYPE "WarrantyIssue" ADD VALUE 'ACC_LOCKED';
ALTER TYPE "WarrantyIssue" ADD VALUE 'ACC_RECLAIMED';
ALTER TYPE "WarrantyIssue" ADD VALUE 'ACC_NOT_AS_DESCRIBED';

-- AlterTable
ALTER TABLE "warranty_requests" ADD COLUMN "videoUrl" TEXT;
