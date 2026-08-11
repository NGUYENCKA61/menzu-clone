-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "soldCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "stockCount" INTEGER NOT NULL DEFAULT 0;
