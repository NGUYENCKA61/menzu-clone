-- CreateEnum
CREATE TYPE "WarrantyIssue" AS ENUM ('KEY_INVALID', 'DETECTED', 'INSTALL', 'OTHER');

-- CreateEnum
CREATE TYPE "WarrantyStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED');

-- CreateTable
CREATE TABLE "warranty_requests" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "issue" "WarrantyIssue" NOT NULL,
    "description" TEXT NOT NULL,
    "imageUrl" TEXT,
    "status" "WarrantyStatus" NOT NULL DEFAULT 'OPEN',
    "adminNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "warranty_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "warranty_requests_userId_createdAt_idx" ON "warranty_requests"("userId", "createdAt");
CREATE INDEX "warranty_requests_status_createdAt_idx" ON "warranty_requests"("status", "createdAt");
CREATE INDEX "warranty_requests_orderId_idx" ON "warranty_requests"("orderId");

-- AddForeignKey
ALTER TABLE "warranty_requests" ADD CONSTRAINT "warranty_requests_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "warranty_requests" ADD CONSTRAINT "warranty_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
