-- What the wallet actually received for this request.
--
-- A scratch card is credited net of the shop's fee, but `amount` has to keep
-- the card's face value — it is what the customer typed and what the desk
-- redeems. Three screens were left inferring the credited figure and each
-- inferred it differently. Nullable: every row written before this column
-- existed has no separate answer to give, and those rows read `amount`.
ALTER TABLE "topups" ADD COLUMN "credited" BIGINT;
