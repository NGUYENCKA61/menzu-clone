-- The cover picture on a member's own overview page. Null means the page
-- falls back to the shop's banner, then to the catalogue's lead cover.
-- AlterTable
ALTER TABLE "users" ADD COLUMN     "bannerUrl" TEXT;
