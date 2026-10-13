-- Text styles (bold, red, big) for a Zalo message written on the web, the
-- receipt above all; the bot passes them to zca-js. Null sends plain text.
ALTER TABLE "zalo_outbox" ADD COLUMN "styles" JSONB;
