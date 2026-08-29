-- "Phiên bản" and "Nền tảng" are gone from the product desk.
--
-- They fed one card on the tool page — the four-tile "Thông tin phần mềm"
-- panel — which the shop replaced with a fixed "Yêu cầu hệ thống" list. After
-- that swap nothing on the site read either column, so the two boxes in the
-- admin wrote to a place no page looked at. Dropping them rather than leaving
-- them behind: a column nothing reads is a column somebody later fills in and
-- then wonders why the page never changed.
--
-- Nullable, unread, and holding nothing but seed placeholders, so this drops
-- no answer the shop typed and means to keep.
ALTER TABLE "products" DROP COLUMN IF EXISTS "version";
ALTER TABLE "products" DROP COLUMN IF EXISTS "platform";
