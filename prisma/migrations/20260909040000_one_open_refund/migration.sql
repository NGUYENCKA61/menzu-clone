-- One open refund request per order, enforced where it cannot be raced.
--
-- The route reads "is there already a PENDING one" and then writes, with the
-- customer's evidence photo being resized in between — a gap long enough for a
-- second tab to slip through. Two open requests on one order can each be
-- approved once, and the wallet is then credited twice for the same purchase.
--
-- A partial index says it once, at the only layer that cannot be outrun.
-- Historical rows are unaffected: it constrains PENDING only, so an order with
-- three settled requests and one open one is still legal.
CREATE UNIQUE INDEX "refund_requests_one_open_per_order"
  ON "refund_requests" ("orderId")
  WHERE "status" = 'PENDING';
