-- AlterTable
ALTER TABLE "feedback" ADD COLUMN "orderId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "feedback_orderId_key" ON "feedback"("orderId");

-- AddForeignKey
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
