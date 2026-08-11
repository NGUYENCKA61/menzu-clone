-- CreateEnum
CREATE TYPE "DocCategory" AS ENUM ('FAQ', 'WARRANTY', 'GUIDE');

-- CreateTable
CREATE TABLE "doc_articles" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" "DocCategory" NOT NULL,
    "excerpt" TEXT,
    "body" TEXT,
    "thumbnailUrl" TEXT NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "doc_articles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "doc_articles_slug_key" ON "doc_articles"("slug");

-- CreateIndex
CREATE INDEX "doc_articles_category_sortOrder_idx" ON "doc_articles"("category", "sortOrder");
