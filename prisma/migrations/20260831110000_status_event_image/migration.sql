-- A status change can now carry a picture, a sentence of its own, and a note
-- of where it came from. All three are nullable: every row written before
-- this was an admin pressing the select, with nothing else attached.
ALTER TABLE "software_status_events" ADD COLUMN "imageUrl" TEXT;
ALTER TABLE "software_status_events" ADD COLUMN "note" TEXT;
ALTER TABLE "software_status_events" ADD COLUMN "source" TEXT;
