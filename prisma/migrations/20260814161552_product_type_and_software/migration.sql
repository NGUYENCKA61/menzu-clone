-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('ACCOUNT_GAME', 'SOFTWARE_GAME');

-- CreateEnum
CREATE TYPE "SoftwareStatus" AS ENUM ('UNDETECTED', 'DETECTED', 'UPDATING');

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "packageId" TEXT,
ADD COLUMN     "quantity" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "description" TEXT,
ADD COLUMN     "name" TEXT,
ADD COLUMN     "productType" "ProductType" NOT NULL DEFAULT 'ACCOUNT_GAME',
ADD COLUMN     "softwareStatus" "SoftwareStatus";

-- CreateTable
CREATE TABLE "product_packages" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "durationDays" INTEGER,
    "price" BIGINT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "product_packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_images" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "product_images_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "product_packages_productId_sortOrder_idx" ON "product_packages"("productId", "sortOrder");

-- CreateIndex
CREATE INDEX "product_images_productId_sortOrder_idx" ON "product_images"("productId", "sortOrder");

-- CreateIndex
CREATE INDEX "products_categoryId_productType_idx" ON "products"("categoryId", "productType");

-- AddForeignKey
ALTER TABLE "product_packages" ADD CONSTRAINT "product_packages_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "product_packages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
