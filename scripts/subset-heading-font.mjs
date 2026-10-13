// Builds the home page's display face (FeaturedCategories) as a small woff2:
// HeadingNow ExtraBold cut down to Basic Latin plus every Vietnamese letter,
// both cases, with the combining marks and a little typographic punctuation.
// The full TTF is 233 KB (79 KB on the wire); the cut is about 21 KB. Kept
// beside its source so the cut can be redone if the tiles ever need more.
//
// subset-font is not a dependency of the shop. Install it once anywhere
// outside the repo and point the script at that folder:
//
//   npm install --prefix <dir> --ignore-scripts subset-font@2.4.0
//   node scripts/subset-heading-font.mjs <dir>
//
// SEO review 13/10/2026, item F20.
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";

const toolDir = process.argv[2];
if (!toolDir) {
  console.error("usage: node scripts/subset-heading-font.mjs <folder where subset-font is installed>");
  process.exit(1);
}
const subsetFont = createRequire(join(toolDir, "package.json"))("subset-font");

const FONTS = "public/sites/menzu-lol-f7ae197a/shared/fonts";
const input = `${FONTS}/headingnow-extrabold.ttf`;
const output = `${FONTS}/headingnow-extrabold-subset.woff2`;

let text = "";
// Basic Latin (letters, digits, punctuation) and the no-break space.
for (let c = 0x20; c <= 0x7e; c++) text += String.fromCodePoint(c);
text += " ";
// Vietnamese letters outside Basic Latin and the U+1EA0 block.
text += "ÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚÝĂĐĨŨƠƯàáâãèéêìíòóôõùúýăđĩũơư";
// Latin Extended Additional, the Vietnamese block: Ạ..ỹ.
for (let c = 0x1ea0; c <= 0x1ef9; c++) text += String.fromCodePoint(c);
// Combining marks, for text typed in decomposed form.
text += "̣̀́̃̉";
// Dashes, curly quotes, ellipsis, middle dot and the dong sign.
text += "–—‘’“”…·₫";

const out = await subsetFont(readFileSync(input), text, { targetFormat: "woff2" });
writeFileSync(output, out);
console.log(`${output}: ${out.length} bytes`);
