-- Why a top-up was refused, written by the desk and read by the customer.
--
-- A refusal used to arrive as the word "Tu choi" and nothing else, which is
-- indistinguishable from the shop taking the money; the reason was then asked
-- for in chat every single time.
ALTER TABLE "topups" ADD COLUMN "note" TEXT;
