-- The two numbers printed on a scratch card, kept on the request that carries
-- them so the desk can redeem the card without asking for them over chat.
-- AlterTable
ALTER TABLE "topups" ADD COLUMN     "cardSerial" TEXT,
ADD COLUMN     "cardPin" TEXT;
