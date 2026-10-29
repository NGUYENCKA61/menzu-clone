-- AlterTable
ALTER TABLE "chat_threads" ADD COLUMN     "adminSeenAt" TIMESTAMP(3),
ADD COLUMN     "guestName" TEXT,
ADD COLUMN     "lastCustomerAt" TIMESTAMP(3);
