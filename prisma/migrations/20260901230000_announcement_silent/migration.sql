-- A notice that waits in the bell instead of opening a modal by itself. Spin
-- wins are why: the card announcing the prize is still on screen, and a reader
-- who spins forty times would otherwise meet forty modals.
ALTER TABLE "announcements" ADD COLUMN "silent" BOOLEAN NOT NULL DEFAULT false;
