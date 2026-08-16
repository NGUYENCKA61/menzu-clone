/*
  Warnings:

  - You are about to drop the column `icon` on the `groups` table. All the
    data in the column will be lost. Deliberate: the shop retired admin-typed
    emoji icons in favour of Lucide glyphs mapped by slug in code.
*/
ALTER TABLE "groups" DROP COLUMN "icon";
