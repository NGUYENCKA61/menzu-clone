-- AlterTable
ALTER TABLE "products" ADD COLUMN "runsOn" TEXT,
ADD COLUMN "launchers" TEXT[] DEFAULT ARRAY[]::TEXT[];
