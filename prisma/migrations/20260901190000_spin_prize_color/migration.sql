-- What each wedge is painted. A palette name, not a colour value: the drawing
-- owns the actual fills, so retuning the palette does not mean rewriting rows.
-- NULL means "auto" — the alternating darks the wheel used before this existed.
ALTER TABLE "spin_prizes" ADD COLUMN "color" TEXT;
