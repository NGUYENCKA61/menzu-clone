-- vp and rp finally say what they hold.
--
-- The columns were named for Valorant's currencies on the site this shop was
-- rebuilt from. Here they have only ever carried the account card's two
-- labelled numbers - VIP and VIP INGAME - and every screen already calls
-- them that. A rename, not a copy: the values stay put.
ALTER TABLE "products" RENAME COLUMN "vp" TO "vip";
ALTER TABLE "products" RENAME COLUMN "rp" TO "vipIngame";
