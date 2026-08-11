-- CreateTable
CREATE TABLE "app_releases" (
    "id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "buildNumber" INTEGER NOT NULL,
    "sizeLabel" TEXT NOT NULL,
    "releasedAt" TIMESTAMP(3) NOT NULL,
    "minAndroid" TEXT NOT NULL,
    "minIos" TEXT NOT NULL,
    "androidUrl" TEXT,
    "iosUrl" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_releases_pkey" PRIMARY KEY ("id")
);
