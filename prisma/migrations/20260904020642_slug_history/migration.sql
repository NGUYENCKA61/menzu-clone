-- CreateEnum
CREATE TYPE "SlugKind" AS ENUM ('CATEGORY', 'PRODUCT');

-- CreateTable
CREATE TABLE "slug_history" (
    "id" TEXT NOT NULL,
    "kind" "SlugKind" NOT NULL,
    "slug" TEXT NOT NULL,
    "categoryId" TEXT,
    "productId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "slug_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "slug_history_categoryId_idx" ON "slug_history"("categoryId");

-- CreateIndex
CREATE INDEX "slug_history_productId_idx" ON "slug_history"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "slug_history_kind_slug_key" ON "slug_history"("kind", "slug");

-- AddForeignKey
ALTER TABLE "slug_history" ADD CONSTRAINT "slug_history_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slug_history" ADD CONSTRAINT "slug_history_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
