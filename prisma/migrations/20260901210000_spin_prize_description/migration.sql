-- A sentence about the prize, for the places with room for one: the reward
-- list and the card that tells a winner what they got. Not the wedge, which
-- fits a few characters and no more.
ALTER TABLE "spin_prizes" ADD COLUMN "description" TEXT;
