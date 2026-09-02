-- A button on a notice that goes somewhere: "Xem ngay" beside a refund request
-- lands on the request itself, instead of sending the desk to hunt for it.
-- Both or neither — a labelled button with nowhere to go is worse than none.
ALTER TABLE "announcements" ADD COLUMN "ctaLabel" TEXT;
ALTER TABLE "announcements" ADD COLUMN "ctaHref" TEXT;
