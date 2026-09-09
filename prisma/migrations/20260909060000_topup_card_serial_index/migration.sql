-- The lookup behind "has this card been sent before?".
--
-- Asked once per scratch-card top-up, against a table that grows with every
-- request the shop has ever taken; without it the check is a sequential scan
-- on the customer's own click.
CREATE INDEX "topups_carrier_cardSerial_idx"
  ON "topups" ("carrier", "cardSerial");
