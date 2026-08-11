-- CreateTable
CREATE TABLE "bio_profiles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tagline" TEXT,
    "avatarUrl" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bio_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bio_links" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sublabel" TEXT,
    "url" TEXT NOT NULL,
    "iconUrl" TEXT NOT NULL,
    "page" INTEGER NOT NULL DEFAULT 1,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "bio_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bio_links_profileId_page_sortOrder_idx" ON "bio_links"("profileId", "page", "sortOrder");

-- AddForeignKey
ALTER TABLE "bio_links" ADD CONSTRAINT "bio_links_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "bio_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
