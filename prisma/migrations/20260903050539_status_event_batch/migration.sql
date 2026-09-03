-- AlterTable
ALTER TABLE "software_status_events" ADD COLUMN     "batchId" TEXT,
ADD COLUMN     "categoryId" TEXT;

-- CreateIndex
CREATE INDEX "software_status_events_batchId_idx" ON "software_status_events"("batchId");

-- AddForeignKey
ALTER TABLE "software_status_events" ADD CONSTRAINT "software_status_events_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
