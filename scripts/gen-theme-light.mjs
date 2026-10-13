// Generates src/app/theme-light.css: the site's light dress, in OCEAN BLUE
// (TRIAL, 13/10/2026). The owner first asked for a white trial ("làm thử web
// với giao diện trắng đi"), then for its colours: "Tone trắng kết hợp xanh
// biển" and "Làm sao cho web clean hợp nhất đẹp", white with ocean blue,
// clean, unified and good-looking.
// Run from the repo root:  node scripts/gen-theme-light.mjs
//
// Every rule sits under html[data-theme="light"], so the dark site is left
// exactly as it is, red accent and all. Four parts:
//  1. The palette turned over. Tailwind paints from CSS variables, so white
//     becomes navy ink, every grey scale runs the other way as slate (the
//     blue-leaning grey, so the greys lean the way the accent does) and the
//     bright status shades become their deep ones. The shop's accent
//     variables (--menzu-accent, --brand and their -dark pair) become ocean
//     blue #0b63b6; the accent is the only thing that turns blue.
//  2. Islands that keep the original palette inside: .keep-dark (words over
//     pictures, the admin) and every element whose own background is a solid
//     colour (accent buttons, coloured badges, a white button with dark text).
//     Inside .keep-dark the accent is one step lighter (#1f78d1), to read on
//     black.
//  3. The colours typed as hex, which no variable reaches: one rule per class
//     token found in the source, its variants included, at the specificity of
//     Tailwind's own rule and inside its utilities layer, so a hover written
//     next to it still wins as it does on the dark site.
//  4. The ocean finish: one white surface, one hairline, one blue. Faint
//     panels become white cards, quiet buttons white with a firm line, hovers
//     a cool tint, selected pills soft blue, accent tints solid; glows, beams,
//     blurs and in-flow shadows go. Sale signals (the MIỄN PHÍ ribbon, the -N%
//     chips, the flash-sale button) and error lines keep the shop red, and
//     Tailwind's red, rose, emerald and amber keep meaning what they mean.
//  5. A second TRIAL on top (13/10/2026, "style trắng đen đi làm sao giống
//     nike thử"): black and white after Nike, under
//     html[data-theme="light"][data-variant="nike"] only (?giao-dien=nike).
//     Mostly the tokens above turned to Nike's greys and black, plus a few
//     broad rules: pills, sentence case, no decoration, boxless cards.
//  6. A third TRIAL (14/10/2026, "Biến tấu sao cho đẹp hơn đi ở bản sáng"):
//     white and ocean blue with a near-black navbar and calm white cards,
//     under html[data-theme="light"][data-variant="moi"] only
//     (?giao-dien=moi). Blocks are reached through hook classes the
//     components carry (home-hero, row-tile, tool-card...), not Tailwind
//     strings.
//
// Classes are matched as whole tokens. A substring match once caught
// "selection:bg-[var(--menzu-accent)]/30" on every page wrapper and put the
// white text back on the whole page.
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const OUT = "src/app/theme-light.css";
const SKIP = new Set([path.join("src", "app", "preview-tiles")]);

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP.has(p)) walk(p, out);
    } else if (/\.tsx?$/.test(entry.name)) out.push(p);
  }
  return out;
}

// Every class-like token in the source, as typed.
const tokens = new Set();
for (const file of walk("src")) {
  for (const token of fs.readFileSync(file, "utf8").split(/[\s"'`{}]+/)) {
    if (token) tokens.add(token);
  }
}

// Tailwind's palette as shipped, so a restored colour is the exact original.
// Resolved the way Node finds a package (walking up), so the script also runs
// in a git worktree that shares the main checkout's node_modules.
const THEME = fs.readFileSync(createRequire(import.meta.url).resolve("tailwindcss/theme.css"), "utf8");
const TW = new Map(
  [...THEME.matchAll(/--color-([a-z]+(?:-\d+)?):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]),
);
function tw(name) {
  const value = TW.get(name);
  if (!value) throw new Error(`--color-${name} is not in tailwindcss/theme.css`);
  return value;
}

const GREYS = ["neutral", "zinc", "gray", "slate", "stone"];
const CHROMA = [
  "red", "orange", "amber", "yellow", "lime", "green", "emerald", "teal", "cyan",
  "sky", "blue", "indigo", "violet", "purple", "fuchsia", "pink", "rose",
];
const SHADES = ["50", "100", "200", "300", "400", "500", "600", "700", "800", "900", "950"];
const MIRROR = {
  50: "950", 100: "900", 200: "800", 300: "700", 400: "600", 500: "500",
  600: "400", 700: "300", 800: "200", 900: "100", 950: "50",
};
// A shade drawn bright for a black ground, and the one that reads on white.
const DEEP = { 50: "800", 100: "800", 200: "700", 300: "700", 400: "700" };

// The palette colours the source paints with; only those get turned over.
const used = new Set();
for (const token of tokens) {
  for (const m of token.matchAll(/-([a-z]+)-(\d{2,3})(?=$|\/|\])/g)) used.add(`${m[1]}-${m[2]}`);
}

// One cool grey family: neutral, zinc and gray mirrored as pure greys sat
// beside a cool page and a blue accent, so every grey scale mirrors slate.
// The two middle steps are set by hand so muted words read on white: 500 at
// 5.25:1, and 600 (the dark site's dim grey: timestamps, captions) at 4.65:1
// instead of 2.6:1, still the quietest text. The islands get the originals
// back, 500s included.
const GREY_MIDDLE = { 500: "#5f6d82", 600: "#6b7586" };
const flips = new Map([["white", "var(--light-ink)"]]);
for (const family of GREYS) {
  if (!SHADES.some((s) => used.has(`${family}-${s}`))) continue;
  for (const s of SHADES) flips.set(`${family}-${s}`, GREY_MIDDLE[s] ?? tw(`slate-${MIRROR[s]}`));
}
for (const family of CHROMA) {
  for (const s of Object.keys(DEEP)) {
    if (used.has(`${family}-${s}`)) flips.set(`${family}-${s}`, tw(`${family}-${DEEP[s]}`));
  }
}
const flipLines = [...flips].map(([name, value]) => `  --color-${name}: ${value};`).join("\n");
const restoreLines = [...flips.keys()]
  .map((name) => `  --color-${name}: ${name === "white" ? "#fff" : tw(name)};`)
  .join("\n");

// ---- Class tokens -------------------------------------------------------

const VARIANTS = String.raw`((?:[a-z0-9-]+:)*)`;
const ALPHA = String.raw`(?:\/(\d{1,3}|\[(?:0?\.\d+|\d{1,3}%)\]))?`;

/** "/70" → 70, "/[0.97]" → 97, "/[50%]" → 50, none → 100. */
function alphaOf(token) {
  const m = token.match(/\/(\d{1,3}|\[(0?\.\d+|\d{1,3}%)\])$/);
  if (!m) return 100;
  if (m[2]) return m[2].endsWith("%") ? Number(m[2].slice(0, -1)) : Math.round(Number(m[2]) * 100);
  return Number(m[1]);
}

const BREAKPOINTS = { sm: "40rem", md: "48rem", lg: "64rem", xl: "80rem", "2xl": "96rem" };
const PSEUDOS = {
  hover: ":hover",
  focus: ":focus",
  "focus-visible": ":focus-visible",
  "focus-within": ":focus-within",
  active: ":active",
  disabled: ":disabled",
};
const GROUPS = { "group-hover": ":hover", "group-focus-within": ":focus-within" };

function esc(cls) {
  return cls.replace(/[^a-zA-Z0-9_-]/g, (c) => `\\${c}`);
}

/**
 * The selector Tailwind builds for a token: { media, selector, interactive },
 * or null for a variant this file does not know (reported at the end).
 */
function target(token, variants) {
  let media = null;
  let suffix = "";
  let interactive = false;
  for (const v of variants) {
    if (BREAKPOINTS[v]) media = `(width >= ${BREAKPOINTS[v]})`;
    else if (PSEUDOS[v]) {
      suffix += PSEUDOS[v];
      interactive = true;
    } else if (GROUPS[v]) {
      suffix += `:is(:where(.group)${GROUPS[v]} *)`;
      interactive = true;
    } else return null;
  }
  return { media, selector: `.${esc(token)}${suffix}`, interactive };
}

function splitVariants(prefix) {
  return prefix ? prefix.slice(0, -1).split(":") : [];
}

function hexInfo(hex) {
  const full = hex.length === 3 ? hex.replace(/(.)/g, "$1$1") : hex;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
  return {
    hex: full.toLowerCase(),
    lum: (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255,
    grey: Math.max(r, g, b) - Math.min(r, g, b) < 26,
    reddish: r > g + 8 && r > b + 4,
  };
}

const skipped = [];

// ---- 2. Islands ---------------------------------------------------------

const ISLAND = new RegExp(
  "^" +
    VARIANTS +
    "((?:bg|from)-(?:" +
    String.raw`\[var\(--(?:menzu-accent|menzu-accent-dark|brand|brand-dark|menzu-violet|menzu-violet-dark)\)\]` +
    "|" +
    `(?:${CHROMA.join("|")})-(?:300|400|500|600|700|800)` +
    "|" +
    String.raw`\[#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})\]` +
    "))" +
    ALPHA +
    "$",
);
const islands = [];
for (const token of [...tokens].sort()) {
  const m = token.match(ISLAND);
  if (!m) continue;
  if (alphaOf(token) < 70) continue;
  const hex = m[2].match(/\[#([0-9a-fA-F]+)\]/);
  if (hex && hexInfo(hex[1]).grey) continue;
  const t = target(token, splitVariants(m[1]));
  if (!t) {
    skipped.push(`island ${token}`);
    continue;
  }
  if (t.media) {
    skipped.push(`island ${token} (breakpoint)`);
    continue;
  }
  islands.push(t.selector);
}

// A white button with dark words on it stays a white button.
const DARK_TEXT = /^(text-black|text-(?:neutral|zinc|gray|slate|stone)-(?:700|800|900|950)|text-\[#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})\])$/;
for (const prefix of ["", "hover:"]) {
  const whites = [...tokens].filter(
    (t) => t.startsWith(`${prefix}bg-white`) && /^bg-white(\/.*)?$/.test(t.slice(prefix.length)) && alphaOf(t) >= 70,
  );
  const darks = [...tokens].filter((t) => {
    if (!t.startsWith(prefix)) return false;
    const base = t.slice(prefix.length);
    if (!DARK_TEXT.test(base)) return false;
    const hex = base.match(/\[#([0-9a-fA-F]+)\]/);
    return !hex || hexInfo(hex[1]).lum < 0.2;
  });
  const pseudo = prefix ? ":hover" : "";
  for (const w of whites.sort()) {
    if (darks.length === 0) continue;
    islands.push(`.${esc(w)}:is(${darks.sort().map((d) => `.${esc(d)}`).join(", ")})${pseudo}`);
  }
}

// ---- 3. Hex colours -----------------------------------------------------

const HEX = new RegExp(
  "^" + VARIANTS + String.raw`(bg|text|border(?:-[trblxy])?|ring|from|via|to)-\[#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\]` + ALPHA + "$",
);
const PROP = {
  bg: "background-color",
  text: "color",
  border: "border-color",
  "border-t": "border-top-color",
  "border-b": "border-bottom-color",
  "border-l": "border-left-color",
  "border-r": "border-right-color",
  "border-x": "border-inline-color",
  "border-y": "border-block-color",
  ring: "--tw-ring-color",
  from: "--tw-gradient-from",
  via: "--tw-gradient-via",
  to: "--tw-gradient-to",
};
// Bright text typed as hex, and the shade that reads on white. Pale gold
// (#FFE5A0) is left out: it only sits on the accent's red.
const TEXT_DEEP = {
  a78bfa: tw("violet-700"),
  fcba03: tw("amber-600"),
  ff6c88: tw("rose-600"),
  "5b9bff": tw("blue-600"),
  "7fb2ff": tw("blue-700"),
  "3fbbf5": tw("sky-600"),
  "6bcdf8": tw("sky-700"),
  "29a9eb": tw("sky-600"),
  "7d87f6": tw("indigo-600"),
  "9aa2f9": tw("indigo-700"),
  "3d8bff": tw("blue-600"),
  "6aa6ff": tw("blue-700"),
  "4c8dff": tw("blue-600"),
};

/** The grounds of the dark site, one step at a time, in light. */
function ground(info, interactive, alpha) {
  // The accent's red-black grounds: a solid sheet is white (the package menu
  // on a tool card); a see-through chip, or a row under the pointer, is the
  // soft blue of a selected pill.
  if (info.reddish && info.lum < 0.12) {
    return interactive || alpha < 100 ? "var(--ocean-soft)" : "var(--light-surface)";
  }
  if (interactive) return "var(--light-surface-hover)";
  // The darkest grounds are the page itself; translucent, they are sheets
  // and bars laid over it, which read as white.
  if (info.lum < 0.045) return alpha < 100 ? "var(--light-surface)" : "var(--light-page)";
  if (info.lum < 0.12) return "var(--light-surface)";
  return "var(--light-surface-hover)";
}

function lightValue(kind, info, interactive, alpha) {
  // A fade blends a picture into the page, so it fades into the page's grey.
  if (kind === "from" || kind === "via" || kind === "to") {
    return info.grey && info.lum < 0.2 ? "var(--light-page)" : null;
  }
  if (kind === "bg") {
    return info.grey && info.lum < 0.2 ? ground(info, interactive, alpha) : null;
  }
  if (kind === "ring") return info.grey && info.lum < 0.2 ? "var(--light-surface)" : null;
  if (kind.startsWith("border")) return info.grey && info.lum < 0.3 ? "var(--light-line)" : null;
  // text
  if (info.grey) {
    if (info.lum > 0.72) return "var(--light-ink-2)";
    if (info.lum > 0.4) return "var(--light-ink-3)";
    if (info.lum < 0.3 && !interactive) return "var(--light-ink-4)";
    return null;
  }
  return TEXT_DEEP[info.hex] ?? null;
}

const hexRules = new Map(); // media → declaration → selectors
let hexCount = 0;
for (const token of [...tokens].sort()) {
  const m = token.match(HEX);
  if (!m) continue;
  const t = target(token, splitVariants(m[1]));
  if (!t) {
    skipped.push(`hex ${token}`);
    continue;
  }
  const alpha = alphaOf(token);
  const value = lightValue(m[2], hexInfo(m[3]), t.interactive, alpha);
  if (!value) continue;
  const decl = `${PROP[m[2]]}: ${alpha < 100 ? `color-mix(in oklab, ${value} ${alpha}%, transparent)` : value};`;
  const media = t.media ?? "";
  if (!hexRules.has(media)) hexRules.set(media, new Map());
  const byDecl = hexRules.get(media);
  if (!byDecl.has(decl)) byDecl.set(decl, []);
  byDecl.get(decl).push(`:where(html[data-theme="light"]) ${t.selector}:where(:not(.keep-dark, .keep-dark *))`);
  hexCount += 1;
}

function block(byDecl, indent) {
  return [...byDecl]
    .map(([decl, selectors]) => `${indent}${selectors.join(`,\n${indent}`)} {\n${indent}  ${decl}\n${indent}}`)
    .join("\n\n");
}
const hexCss = [...hexRules]
  .map(([media, byDecl]) =>
    media ? `  @media ${media} {\n${block(byDecl, "    ")}\n  }` : block(byDecl, "  "),
  )
  .join("\n\n");

// A page's own ground (a min-h-screen wrapper, or a fixed layer behind the
// page) is the page grey on every page, as the home page's is; a card on it
// is white.
const pageGrounds = [...tokens]
  .filter((token) => {
    const m = token.match(/^bg-\[#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\]$/);
    if (!m) return false;
    const info = hexInfo(m[1]);
    return info.grey && info.lum < 0.12;
  })
  .sort()
  .flatMap((token) => [`.min-h-screen.${esc(token)}`, `[class*="fixed"][class*="inset-0"].${esc(token)}`]);

// ---- Wells of black -------------------------------------------------------
// bg-black/20…/60 is a sunken well on the dark site (an input, a progress
// track, a key box, the wallet's switch): a faint grey in light. Over a
// picture (absolutely placed, not a full cover) it is a dark pill with white
// words, and stays one. A full cover (inset-0) is a dim or a scrim: untouched.
const wells = new Map(); // declaration → selectors
for (const token of [...tokens].sort()) {
  const m = token.match(new RegExp("^" + VARIANTS + "bg-black" + String.raw`(\/(?:\d{1,3}|\[(?:0?\.\d+|\d{1,3}%)\]))` + "$"));
  if (!m) continue;
  const t = target(token, splitVariants(m[1]));
  if (!t || t.media) continue;
  const alpha = alphaOf(token);
  // Near-solid black is a dark surface in both dresses (the viewers pill on
  // an account's picture): its words keep the dark palette. A full cover is
  // a scrim whose dialog may sit inside it, so it is left alone.
  if (alpha >= 70) {
    if (!t.interactive) islands.push(`.${esc(token)}:not([class*="inset-"])`);
    continue;
  }
  const decl = `background-color: color-mix(in oklab, var(--light-ink) ${Math.max(2, Math.round(alpha / 8))}%, transparent);`;
  if (!wells.has(decl)) wells.set(decl, []);
  wells
    .get(decl)
    .push(
      `:where(html[data-theme="light"]) ${t.selector}:where(:not(.keep-dark, .keep-dark *, [class*="absolute"], [class*="fixed"], [class*="inset-"]))`,
    );
  if (!t.interactive && alpha >= 30) islands.push(`.${esc(token)}[class*="absolute"]:not([class*="inset-"])`);
}
const wellCss = block(wells, "  ");

// ---- Write-ups ------------------------------------------------------------
// .doc-prose (articles, product write-ups) paints in fixed colours from
// globals.css, and the old site's write-ups carry inline colours: white,
// yellow and bright green that vanish on white. Those few known colours are
// turned to ones that read; red, blue and purple read on both.
const PROSE = `html[data-theme="light"] .doc-prose:not(.keep-dark *)`;
const INLINE = {
  "#ffffff": "var(--light-ink)",
  "#cbcbcb": "var(--light-ink-3)",
  "#ffff00": tw("yellow-700"),
  "#33ff00": tw("green-700"),
  "#00ff00": tw("green-700"),
  "#f39c12": tw("orange-700"),
  "#27ae60": tw("green-700"),
  "#fbbf24": tw("amber-700"),
  "#34d399": tw("emerald-700"),
  "#fb7185": tw("rose-600"),
  "#a78bfa": tw("violet-700"),
};
const inlineCss = Object.entries(INLINE)
  .map(([hex, value]) => {
    const rgb = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(", ");
    const selectors = [`color: ${hex}`, `color:${hex}`, `color: rgb(${rgb})`, `color:rgb(${rgb})`].map(
      (needle) => `${PROSE} [style*="${needle}" i]`,
    );
    return `${selectors.join(",\n")} {\n  color: ${value} !important;\n}`;
  })
  .join("\n\n");

// ---- 4. The ocean finish --------------------------------------------------
// The families of faint white and of accent tint are read from the source by
// their alpha, so a new shade typed in a component joins its family without
// an edit here. Only the bare class and its hover: are matched, as typed.

const ALPHA_ONLY = new RegExp(`^${ALPHA}$`);
/** The source's "<variant><base>/<alpha>" tokens whose alpha is lo..hi %. */
function alphaFamily(variant, base, lo, hi) {
  const head = `${variant}${base}/`;
  return [...tokens]
    .filter((t) => t.startsWith(head) && ALPHA_ONLY.test(t.slice(head.length - 1)))
    .filter((t) => alphaOf(t) >= lo && alphaOf(t) <= hi)
    .sort();
}
/** ":is(.a, .b)<suffix>" for a token list, or null when the list is empty. */
function anyOf(list, suffix = "") {
  return list.length ? `:is(${list.map((t) => `.${esc(t)}`).join(", ")})${suffix}` : null;
}
const LIGHT = `:where(html[data-theme="light"])`;
const NOT_ISLAND = `:where(:not(.keep-dark, .keep-dark *))`;

// A faint lifted panel on black (2-6% white, with a border) is a white card
// on the grey page; a filled quiet button or chip (7-10%) is white with a
// firm hairline; every hover of faint white (up to 10%) is a cool tint.
const panels = anyOf(alphaFamily("", "bg-white", 2, 6));
const quietFills = anyOf(alphaFamily("", "bg-white", 7, 10));
const quietHovers = anyOf(alphaFamily("hover:", "bg-white", 1, 10), ":hover");
// One hairline: the faint white borders (4-12%) and the neutral-800 ones all
// draw the same line instead of five slightly different greys.
const hairlines = anyOf([
  ...alphaFamily("", "border-white", 4, 12),
  ...(tokens.has("border-neutral-800") ? ["border-neutral-800"] : []),
  ...alphaFamily("", "border-neutral-800", 40, 99),
]);

// Accent tints laid over black at 2-25% turn muddy over the grey page, so
// each is a solid mix with white: crisp on any ground and never past 14%,
// where ocean words still read 4.9:1. The mix reads the variable, so a tint
// inside an error line ([role="alert"]) is red like its words.
const TINTS = [
  [1, 5, 4],
  [6, 8, 6],
  [9, 10, 9],
  [11, 15, 12],
  [16, 25, 14],
];
const tintCss = ["menzu-accent", "brand"]
  .flatMap((name) =>
    TINTS.map(([lo, hi, mix]) => {
      const selectors = [
        anyOf(alphaFamily("", `bg-[var(--${name})]`, lo, hi)),
        anyOf(alphaFamily("hover:", `bg-[var(--${name})]`, lo, hi), ":hover"),
      ]
        .filter(Boolean)
        .map((s) => `  ${LIGHT} ${s}${NOT_ISLAND}`);
      if (!selectors.length) return null;
      return `${selectors.join(",\n")} {\n    background-color: color-mix(in srgb, var(--${name}) ${mix}%, #ffffff);\n  }`;
    }),
  )
  .filter(Boolean)
  .join("\n");

const baseDimText = [...tokens].filter((t) => /^text-(?:neutral|zinc|gray|slate|stone)-700$/.test(t)).sort();
const surfaceCss = [
  panels &&
    `  ${LIGHT} ${panels}:where([class*="border"])${NOT_ISLAND} {\n    background-color: var(--light-surface);\n  }`,
  quietFills &&
    `  ${LIGHT} ${quietFills}:where(button, a, label, [role="button"], [role="tab"])${NOT_ISLAND} {\n    background-color: var(--light-surface);\n    box-shadow: inset 0 0 0 1px var(--light-line-strong);\n  }`,
  quietHovers && `  ${LIGHT} ${quietHovers}${NOT_ISLAND} {\n    background-color: var(--light-surface-hover);\n  }`,
  hairlines && `  ${LIGHT} ${hairlines}${NOT_ISLAND} {\n    border-color: var(--light-line);\n  }`,
  // Grey 700 as words (the "VNĐ" beside an empty top-up amount): the flip
  // above makes it a hairline grey, 1.5:1 on white, so as text it takes the
  // muted ink; an inactive control keeps its faint grey, as WCAG allows.
  baseDimText.length &&
    `  ${LIGHT} ${anyOf(baseDimText)}:where(:not(:disabled, [aria-disabled="true"], .cursor-default, .cursor-not-allowed))${NOT_ISLAND} {\n    color: var(--light-ink-3);\n  }`,
]
  .filter(Boolean)
  .join("\n");

// The search shells (the parent of an input): white fields with one firm
// hairline, their own border where they have one, an inset line where not.
const SHELLS = String.raw`:is(.bg-neutral-900\/60, .bg-white\/\[0\.07\], .bg-white\/\[0\.08\], .bg-white\/5, .bg-white\/\[0\.04\])`;
const SHELLS_BORDERLESS = String.raw`:is(.bg-white\/\[0\.07\], .bg-white\/\[0\.08\])`;

const oceanCss = String.raw`/* 4. The ocean finish: one white surface, one hairline, one blue. */

/* Brand hexes typed in the source read the accent variable, so inside an
   island they take its lifted blue. */
html[data-theme="light"] .bg-\[\#e13d3f\] { background-color: var(--menzu-accent); }
html[data-theme="light"] .hover\:bg-\[\#c92f33\]:hover { background-color: var(--menzu-accent-dark); }
html[data-theme="light"] .text-\[\#e13d3f\] { color: var(--menzu-accent); }
html[data-theme="light"] .border-\[\#ff3158\] { border-color: var(--menzu-accent); }
/* The package menu on a tool card was a red-black sheet; now a white one
   (its ground comes from the hex rules above). */
html[data-theme="light"] .bg-\[\#160b0e\]:not(.keep-dark *) { border-color: var(--light-line-strong); }

/* Sale signals keep the shop red: the accent variable is turned back to red on
   them alone (the free-tool corner ribbon, which the owner asked to keep red
   on 13/10, the % chip after a struck price on a product card, and the
   flash-sale price button). */
html[data-theme="light"] :is(
  .-rotate-45.bg-\[var\(--menzu-accent\)\],
  .line-through + .bg-\[var\(--menzu-accent\)\],
  .from-\[var\(--menzu-accent\)\].to-\[var\(--menzu-accent-dark\)\]
) {
  --menzu-accent: var(--sale-red);
  --menzu-accent-dark: var(--sale-red-dark);
}
html[data-theme="light"] .-rotate-45.bg-\[var\(--menzu-accent\)\] { background-color: var(--sale-red); background-image: none; }
/* The buy panel's "-N%" tint chip after a struck price: red tint, red words. */
html[data-theme="light"] .line-through + .bg-\[var\(--menzu-accent\)\]\/15 {
  background-color: color-mix(in srgb, var(--sale-red) 12%, #ffffff);
  color: var(--sale-red-ink);
}
/* An error line written in the accent is still an error. */
html[data-theme="light"] [role="alert"] {
  --menzu-accent: #c62a2f;
  --menzu-accent-dark: #a82226;
  --brand: #c62a2f;
  --brand-dark: #a82226;
}

/* Header, top strip, footer, separators. The header is solid white with one
   line under it: no blur, no shadow when the page scrolls. */
html[data-theme="light"] .site-nav {
  background-color: #ffffff;
  box-shadow: 0 1px 0 0 var(--light-line);
  backdrop-filter: none;
}
html[data-theme="light"] .site-nav > div:first-child {
  background-color: var(--light-band);
  border-bottom-color: var(--light-line);
}
html[data-theme="light"] .site-nav > div:first-child a { color: var(--light-ink-3); }
html[data-theme="light"] .site-nav > div:first-child a:hover { color: var(--ocean); }
/* The logo picture stays red (it is a file). Its tagline joins the blue and
   the spinning arc round it goes: one moving thing less in the header (and in
   the phone drawer, where it spun loose beside the menu button). */
html[data-theme="light"] a[href="/"] .text-red-500 { color: var(--ocean); }
html[data-theme="light"] .navbar-spin-ring { display: none; }

html[data-theme="light"] footer.bg-\[\#0f1015\] {
  background-color: var(--light-band);
  border-top-color: var(--light-line);
}
html[data-theme="light"] footer.bg-\[\#0f1015\] a:hover { color: var(--ocean); }
/* The dim step (#6b7586) is 4.06:1 on the band: one step up inside the frame. */
html[data-theme="light"] :is(footer.bg-\[\#0f1015\], .site-nav > div:first-child) :is(.text-neutral-600, .text-zinc-600, .text-slate-600, .text-gray-600) {
  color: var(--light-ink-3);
}
html[data-theme="light"] footer.bg-\[\#0f1015\] .border-t { border-top-color: var(--light-line); }
html[data-theme="light"] .before\:bg-white\/\[0\.06\]::before { background-color: var(--light-line); }

/* Decorative effects, quiet in the light dress (the islands keep theirs). */
html[data-theme="light"] :is(.blur-\[60px\], .blur-\[120px\], .blur-\[140px\], .blur-\[180px\], .blur-lg):not(.keep-dark *) { display: none; }
html[data-theme="light"] :is(.spot-glow, .border-beam, .val-scan-line):not(.keep-dark *) { display: none; }
html[data-theme="light"] .animate-ping:not(.keep-dark *) { display: none; }
html[data-theme="light"] .rounded-full.animate-pulse:not(.keep-dark *) { animation: none; }
html[data-theme="light"] :is(.search-glow, .search-glow-brand, .invoice-breathe):not(.keep-dark *) { animation: none; box-shadow: none; }
html[data-theme="light"] .vip-text-glow:not(.keep-dark *) { animation: none; text-shadow: none; }
html[data-theme="light"] [class*="drop-shadow-[0_0"]:not(.keep-dark *) { filter: none; }
/* No glow anywhere outside the islands. */
html[data-theme="light"] :is([class*="shadow-[0_0_"], [class*="shadow-[0_6px_22px"]):not(.keep-dark, .keep-dark *) { --tw-shadow: 0 0 #0000; }
/* Hairlines instead of shadows on everything in the flow. Floating layers
   (menus, sheets, toasts, dialogs) keep one soft cool shadow. */
html[data-theme="light"] [class*="shadow"]:not([class*="absolute"], [class*="fixed"], [class*="sticky"], [class*="absolute"] > *, [class*="fixed"] > *, [role="dialog"], [role="listbox"], [role="menu"], .keep-dark, .keep-dark *) {
  --tw-shadow: 0 0 #0000;
}
html[data-theme="light"] :is(.shadow-black\/30, .shadow-black\/40, .shadow-black\/60, .hover\:shadow-black\/40:hover):not(.keep-dark, .keep-dark *) {
  --tw-shadow-color: rgb(15 27 45 / 0.1);
}
/* A card lit from one corner by an accent wash is a plain white card. */
html[data-theme="light"] [class*="from-[var(--menzu-accent)]/"]:not(.keep-dark *) {
  background-image: none;
  background-color: var(--light-surface);
}

/* The scope search: red rim, red reticle, red spinner, now one quiet blue. */
html[data-theme="light"] .border-\[rgba\(239\,68\,68\,0\.2\)\]:not(.keep-dark *) {
  border-width: 1px;
  border-color: var(--light-line-strong);
}
html[data-theme="light"] .border-\[rgba\(239\,68\,68\,0\.2\)\]:focus-within:not(.keep-dark *) {
  border-color: var(--ocean);
  box-shadow: 0 0 0 3px var(--ocean-ring);
}
html[data-theme="light"] :is([stroke="#ef4444"], [stroke="rgba(239,68,68,0.35)"]):not(.keep-dark *) { stroke: var(--ocean); }
html[data-theme="light"] .val-cross-ring:not(.keep-dark *) { opacity: 0.45; animation: none; }
html[data-theme="light"] .val-dot-blink:not(.keep-dark *) { fill: var(--ocean); animation: none; }
html[data-theme="light"] .text-\[\#ef4444\]\/80:not(.keep-dark *) { color: var(--ocean); }

/* Surfaces, quiet buttons, hairlines and accent tints, inside Tailwind's
   utilities layer at its specificity, so the hover written beside each class
   still wins. Base and hover classes sit in separate lists for that reason. */
@layer utilities {
${surfaceCss}
  ${LIGHT} ${SHELLS}:where(:has(> input, > textarea))${NOT_ISLAND} {
    background-color: var(--light-surface);
    border-color: var(--light-line-strong);
  }
  ${LIGHT} ${SHELLS_BORDERLESS}:where(:has(> input, > textarea)):where(:not([class*="border"], .keep-dark, .keep-dark *)) {
    box-shadow: inset 0 0 0 1px var(--light-line-strong);
  }
${tintCss}
}
/* A field being typed in: the blue line and a soft ring. */
html[data-theme="light"] ${SHELLS}:has(> input:focus, > textarea:focus):not(.keep-dark, .keep-dark *) {
  border-color: var(--ocean);
  box-shadow: 0 0 0 3px var(--ocean-ring);
}
html[data-theme="light"] ${SHELLS_BORDERLESS}:not([class*="border"]):has(> input:focus, > textarea:focus):not(.keep-dark, .keep-dark *) {
  box-shadow: inset 0 0 0 1px var(--ocean), 0 0 0 3px var(--ocean-ring);
}

/* Selected pills, chips and tabs: soft blue with a blue hairline (the
   --color-white turn makes their white words blue). Solid blue is kept for
   actions: Mua ngay, Thuê ngay, Tìm kiếm, Đăng nhập. */
html[data-theme="light"] :is([aria-pressed="true"], [aria-selected="true"], [aria-current="page"])[class]:is(.bg-\[var\(--menzu-accent\)\], .bg-\[var\(--brand\)\]):not(.keep-dark, .keep-dark *) {
  --color-white: var(--ocean);
  background-color: var(--ocean-soft);
  border-color: var(--ocean-line);
  box-shadow: inset 0 0 0 1px var(--ocean-line);
  color: var(--ocean);
}

/* Fields and focus. */
html[data-theme="light"] :is(input, textarea):not(.keep-dark *)::placeholder { color: #6b7586; } /* 4.65:1 on white */
html[data-theme="light"] :is(a, button, [role="button"], [role="tab"], summary):focus-visible:not([class*="focus-visible:ring"], [class*="focus:ring"], .keep-dark *) {
  outline: 2px solid var(--ocean);
  outline-offset: 2px;
}

/* The few places that need a hand. The support bubble and its panel
   (supportChrome.ts): frosted dark glass over the hero video turned muddy on
   a phone. Solid white, hairline, one float. */
html[data-theme="light"] .bg-\[\#0b0b10\]\/70:not(.keep-dark *) {
  background-color: rgb(255 255 255 / 0.97);
  border-color: var(--light-line);
  box-shadow: var(--float-shadow);
}
html[data-theme="light"] .bg-\[\#0b0b10\]\/70.hover\:bg-\[\#14141c\]\/80:hover:not(.keep-dark *) {
  background-color: var(--light-surface-hover);
}
/* The category filter panel (filterChrome.ts) is white like the two search
   fields above it, so the three read as one control block. */
html[data-theme="light"] .bg-neutral-900\/35.border-neutral-800\/40:not(.keep-dark *) {
  background-color: var(--light-surface);
}
/* The home hero video: its 140px black halo is gone with the in-flow shadows;
   a soft navy drop keeps it lifted off the page. */
html[data-theme="light"] [class*="0_0_140px_30px"]:not(.keep-dark *) {
  box-shadow: 0 28px 56px -32px rgb(15 27 45 / 0.35);
}
/* Rating stars: warm gold with a deeper rim, not burnt orange. Decorative (the
   rating is in the aria-label), so the 2.5:1 rim is fine. */
html[data-theme="light"] .fill-amber-400:not(.keep-dark *) {
  color: #e8920a;
  fill: #fbb124;
}

/* OWNER'S CALL, off by default: /categories dims games with nothing on sale
   to 45%, which goes milky on white. Greyscale at 82% (full colour under the
   pointer) is crisp, but it changes the "not on sale" signal, so it ships
   only on the owner's yes.
html[data-theme="light"] .opacity-45.transition-opacity:not(.keep-dark *) {
  opacity: 0.82;
  filter: grayscale(1);
  transition: opacity 0.2s ease, filter 0.2s ease;
}
html[data-theme="light"] .opacity-45.transition-opacity:not(.keep-dark *):is(:hover, :focus-within) {
  opacity: 1;
  filter: none;
}
*/
`;

// ---- 5. The Nike variant (TRIAL) ------------------------------------------
// The owner (13/10/2026): "style trắng đen đi làm sao giống nike thử", black
// and white, as close to Nike as can be, as a trial. A third dress on top of
// the light one: ?giao-dien=nike sets data-theme="light" AND
// data-variant="nike" on <html>, so every rule here sits under both and the
// dark site and the ocean dress never see it. It is mostly tokens: the ocean
// dress already paints from --light-* and --ocean, and those turn to Nike's
// greys (#111 ink, #707072 secondary, #e5e5e5 hairline, #f5f5f5 wells) and
// black. The rest is a few broad rules for what Nike does differently: pills,
// sentence case, no decoration, product cards with no box.

const NIKE = `html[data-theme="light"][data-variant="nike"]`;
const NIKE_W = `:where(${NIKE})`;
/** Exclusions that add no specificity, so the order of the rules decides. */
const unless = (...selectors) => `:where(:not(${selectors.join(", ")}))`;
// Out of the islands, at one class of specificity: the weight the ocean
// rules carry (":not(.keep-dark *)"), so where a Nike rule and an ocean rule
// tie, the Nike one, written later, wins.
const NOT_DARK = ":not(.keep-dark, .keep-dark *)";
// The logo's tagline keeps its letter-spaced capitals: it is the lockup, not
// UI text. The free-tool ribbon (-rotate-45) keeps its look and its red.
const LOCKUP = ['a[href="/"] .text-red-500', ".-rotate-45"];

// Nike's grey scale (Podium CDS): grey-50 #fafafa … grey-900 #1f1f21, black
// #111111. Every grey family the dark site uses mirrors onto it, so the greys
// are neutral like Nike's instead of the ocean's slate. 500 and 600 (muted and
// dim words) both land on Nike's secondary #707072: 4.94:1 on white, 4.53:1
// on the #f5f5f5 well, the quietest step that still reads.
const NIKE_GREY = {
  50: "#111111", 100: "#1f1f21", 200: "#28282a", 300: "#39393b", 400: "#4b4b4d",
  500: "#707072", 600: "#707072", 700: "#cacacb", 800: "#e5e5e5", 900: "#f5f5f5", 950: "#fafafa",
};
const nikeFlipLines = [...flips.keys()]
  .filter((name) => GREYS.some((family) => name.startsWith(`${family}-`)))
  .map((name) => `  --color-${name}: ${NIKE_GREY[name.split("-")[1]]};`)
  .join("\n");

const cls = (token) => `.${esc(token)}`;
// Small UI text (9-11.5px, as typed without a variant) rises to 12px, Nike's
// smallest; wide tracking (any positive tracking class, variants included)
// goes to 0.
const smallText = [...tokens]
  .filter((t) => /^text-\[(\d+(?:\.\d+)?)px\]$/.test(t))
  .filter((t) => {
    const px = Number(t.match(/\[(\d+(?:\.\d+)?)px/)[1]);
    return px >= 9 && px < 12;
  })
  .sort();
// The raise is for the phone size only: a size written for a wider screen
// beside a small one (TRUST_NOTE_TEXT's "text-[11px] sm:text-sm", 14px on a
// desktop) must still win there. So the raise sits in the utilities layer at
// Tailwind's specificity, and after it every breakpoint size found in the
// source is written again for those same elements, inside its own media
// query and in breakpoint order, at its own value (or 12px where that value
// is smaller too, as in "text-[9px] sm:text-[10px]").
const TEXT_SIZE = new Map(
  [...THEME.matchAll(/--text-([a-z0-9]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]),
);
/** "40rem" or "360px" → px. */
const toPx = (length) => parseFloat(length) * (length.endsWith("rem") ? 16 : 1);
const sizeAtBreakpoint = [];
for (const token of [...tokens].sort()) {
  const m = token.match(
    /^(sm|md|lg|xl|2xl|min-\[(\d+(?:\.\d+)?(?:px|rem))\]):text-(xs|sm|base|lg|[2-9]?xl|\[(\d+(?:\.\d+)?(?:px|rem))\])$/,
  );
  if (!m) continue;
  const min = m[2] ?? BREAKPOINTS[m[1]];
  const size = m[4] ?? TEXT_SIZE.get(m[3]);
  if (!size) throw new Error(`nike: no --text-${m[3]} in tailwindcss/theme.css`);
  sizeAtBreakpoint.push({ token, min, px: toPx(min), size: toPx(size) < 12 ? "12px" : size });
}
sizeAtBreakpoint.sort((a, b) => a.px - b.px || a.token.localeCompare(b.token));
const wideTracking = [...tokens]
  .filter((t) => /^(?:[a-z0-9-]+:)*tracking-(?:wide|wider|widest|\[0?\.\d+em\])$/.test(t))
  .sort();
// Accent tints and faint accent outlines, at any alpha below the islands' 70%.
const accentTints = ["menzu-accent", "brand"].flatMap((n) => alphaFamily("", `bg-[var(--${n})]`, 1, 69));
const accentTintHovers = ["menzu-accent", "brand"].flatMap((n) => alphaFamily("hover:", `bg-[var(--${n})]`, 1, 69));
const accentLines = ["menzu-accent", "brand"].flatMap((n) => alphaFamily("", `border-[var(--${n})]`, 1, 69));
for (const [name, list] of Object.entries({
  smallText,
  sizeAtBreakpoint,
  wideTracking,
  accentTints,
  accentTintHovers,
  accentLines,
})) {
  if (!list.length) throw new Error(`nike: no ${name} tokens found in src`);
}
// Grey 700 is a step a dark site uses for its dimmest words; on Nike's scale
// it is #cacacb, 1.6:1 on white. As text (an empty gallery's label, the pager's
// ellipsis, the footer's dots) it takes the secondary grey; a control drawn
// as inactive keeps its faint grey, as WCAG allows.
const dimText = [...tokens].filter((t) => /^text-(?:neutral|zinc|gray|slate|stone)-700$/.test(t)).sort();

const SMALL_TEXT_EX = unless(...LOCKUP, '[aria-hidden="true"]') + NOT_ISLAND;
const SMALL_TEXT_ONLY = `:where(${smallText.map(cls).join(", ")})`;
const smallTextCss = [
  `  ${NIKE_W} ${anyOf(smallText)}${SMALL_TEXT_EX} {\n    font-size: 12px;\n  }`,
  ...[...Map.groupBy(sizeAtBreakpoint, (s) => s.min)].map(
    ([min, list]) =>
      `  @media (width >= ${min}) {\n` +
      [...Map.groupBy(list, (s) => s.size)]
        .map(
          ([size, same]) =>
            `    ${NIKE_W} ${anyOf(same.map((s) => s.token))}${SMALL_TEXT_ONLY}${SMALL_TEXT_EX} {\n      font-size: ${size};\n    }`,
        )
        .join("\n") +
      "\n  }",
  ),
].join("\n");

const ACCENT_FILL = String.raw`:is(.bg-\[var\(--menzu-accent\)\], .bg-\[var\(--brand\)\])`;
const SELECTED_STATE = `:is([aria-pressed="true"], [aria-selected="true"], [aria-current="page"], [aria-current="true"])`;
// The solid accent buttons: Mua ngay, Thuê ngay, Tìm kiếm, Đăng nhập, Nạp tiền.
const PRIMARY = `:is(a, button, [role="button"])${ACCENT_FILL}${unless(
  '[aria-pressed="true"]',
  '[aria-selected="true"]',
  "[aria-current]",
  String.raw`.border-\[var\(--menzu-accent\)\]`,
)}${NOT_DARK}`;
// The quiet CTAs beside them: an outline or a faint fill, in the shop's caps.
const quietFillTokens = alphaFamily("", "bg-white", 7, 10);
const SECONDARY = `:is(a, button).uppercase:is([class*="border-white/"], [class*="border-[var(--menzu-accent)]/"]${quietFillTokens
  .map((t) => `, ${cls(t)}`)
  .join("")})${unless("[aria-pressed]", "[aria-selected]")}${NOT_DARK}`;
// Round icon buttons: arrows, steppers, social marks.
const ICON_BUTTON = `:is(a, button)[class*="border-white/"]:is(.h-9.w-9, .h-10.w-10, .h-11.w-11)${NOT_DARK}`;
// Chips not picked: the pressed=false toggles and pillTab's grey well.
const CHIP_OFF = String.raw`:is([aria-pressed="false"], .border-white\/10.bg-white\/5.uppercase)` + NOT_DARK;
// Chips, tabs, packages and pages that are picked.
const CHIP_ON = `:is(${SELECTED_STATE}:is(${ACCENT_FILL.slice(4, -1)}, [class*="bg-[var(--menzu-accent)]/"]), ${String.raw`.border-\[var\(--menzu-accent\)\].bg-\[var\(--menzu-accent\)\]`})${NOT_DARK}`;
// Search shells (the parent of an input) and the header's search label.
const FIELD_SHELL = `:is(${SHELLS.slice(4, -1)}, ${String.raw`.border-\[rgba\(239\,68\,68\,0\.2\)\]`})`;
const HEADER_FIELD = String.raw`label:has(input):is(.bg-white\/\[0\.07\], .bg-\[\#17171c\])`;
const FIELD = `:is(input:not([type="checkbox"], [type="radio"], [type="range"], [type="file"]), textarea, select)${unless('[class*="bg-transparent"]')}${NOT_DARK}`;
// The product and account cards (SoftwareCard, ProductCard).
const CARD = String.raw`.lift-card.border-\[\#24252a\]` + NOT_DARK;
const FOOTER = String.raw`footer.bg-\[\#0f1015\]`;
const TYPE_EX = unless("h1", ...LOCKUP) + NOT_DARK;
// The old site's write-ups paint warnings in pure red (#ff0000, 4.0:1 on
// white); Nike's critical red #d30005 reads (5.58:1) and is still red.
const nikeInlineCss = Object.entries({ "#ff0000": "#d30005" })
  .map(([hex, value]) => {
    const rgb = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(", ");
    const selectors = [`color: ${hex}`, `color:${hex}`, `color: rgb(${rgb})`, `color:rgb(${rgb})`].map(
      (needle) => `${NIKE} .doc-prose${unless(".keep-dark *")} [style*="${needle}" i]`,
    );
    return `${selectors.join(",\n")} {\n  color: ${value} !important;\n}`;
  })
  .join("\n");

const nikeCss = String.raw`/* 5. NIKE (TRIAL, 13/10/2026): black and white, as close to Nike as can be.
   On only under html[data-variant="nike"] (?giao-dien=nike); the dark site and
   the ocean dress never match these rules. */
${NIKE} {
  /* Not pure white (the owner, 14/10/2026: "làm sao bớt chói đi", "màu sáng
     nó chói"): a soft off-white page, panels one step lighter, wells and the
     line one step darker, so nothing glares and the layers still separate. */
  --light-page: #f4f4f2;
  --light-surface: #fbfbfa;
  --light-surface-hover: #efeeeb;
  --light-line: #e2e1dd;
  --light-line-strong: #cacacb; /* field outlines, secondary buttons */
  --light-band: #ecebe8; /* bands (footer) */
  /* Two inks and one grey: #111, and #666668 (5.2:1 on the page, 4.8:1 on a well). */
  --light-ink: #111111;
  --light-ink-2: #111111;
  --light-ink-3: #666668; /* 5.2:1 on the page, 4.8:1 on a well */
  /* The dimmest step still paints words (a dim hex grey, list numbers), so it
     is the secondary grey too, not Nike's #9e9ea0 (2.7:1). */
  --light-ink-4: #666668;
  --nike-well: #ecebe8; /* behind pictures, fields, quiet chips */
  --nike-well-hover: #e2e1dd;
  /* The accent is black; hover #3a3a3a (white on it 11.4:1). */
  --ocean: #111111;
  --ocean-dark: #3a3a3a;
  --ocean-soft: #ecebe8;
  --ocean-line: #cacacb;
  --ocean-ring: rgb(17 17 17 / 0.12);
  --brand: #111111;
  --brand-dark: #3a3a3a;
  --menzu-accent: #111111;
  --menzu-accent-dark: #3a3a3a;
  --primary: #111111;
  --ring: #111111;
  --menzu-backdrop-dim: rgb(244 244 242 / 0.72);
  --menzu-scroll-thumb: #cacacb;
  --menzu-scroll-thumb-hover: #9e9ea0;
  --menzu-scroll-thumb-active: #111111;
  --float-shadow: 0 2px 6px rgb(0 0 0 / 0.05), 0 18px 44px -18px rgb(0 0 0 / 0.22);

  /* Every grey on Nike's neutral scale. */
${nikeFlipLines}
}

/* Islands keep their dark palette; the accent there is white, and a white
   fill carries black words (Nike's white pill over a picture). The sale
   signals turn the accent back to red on themselves, so they keep white
   words. */
${NIKE} .keep-dark {
  --menzu-accent: #ffffff;
  --brand: #ffffff;
  --menzu-accent-dark: #e5e5e5;
  --brand-dark: #e5e5e5;
}
${NIKE} .keep-dark ${ACCENT_FILL}[class]${unless(
  ".-rotate-45",
  ".line-through + *",
  String.raw`.from-\[var\(--menzu-accent\)\]`,
)} {
  --color-white: #111111;
  color: #111111;
}

@layer base {
  ${NIKE} :not(.keep-dark, .keep-dark *) {
    --tw-shadow-color: rgb(0 0 0 / 0.08);
  }
}

/* Accent tints are the quiet grey well; faint accent outlines one hairline.
   In the utilities layer at Tailwind's specificity, so a hover written beside
   the class still wins. */
@layer utilities {
  ${NIKE_W} ${anyOf(accentTints)}${NOT_ISLAND} {
    background-color: var(--nike-well);
  }
  ${NIKE_W} ${anyOf(accentTintHovers, ":hover")}${NOT_ISLAND} {
    background-color: var(--nike-well-hover);
  }
  ${NIKE_W} ${anyOf(accentLines)}${NOT_ISLAND} {
    border-color: var(--light-line);
  }
  ${NIKE_W} ${anyOf(dimText)}${unless(
    ":disabled",
    '[aria-disabled="true"]',
    ".cursor-default",
    ".cursor-not-allowed",
  )}${NOT_ISLAND} {
    color: #707072;
  }

  /* Small UI words are 12px at least, on a phone only where a wider screen
     has its own size (see sizeAtBreakpoint in the script). */
${smallTextCss}
}

/* Decoration off: the accent bars before headings and card titles, the accent
   ring round avatars, the hero video's drop. */
${NIKE} :is([class*="w-[3px]"], [class*="w-[2px]"])${ACCENT_FILL}${NOT_DARK} { display: none; }
${NIKE} .rounded-full[class*="border-[var(--menzu-accent)]"]${NOT_DARK} { border-color: var(--light-line); }
${NIKE} [class*="0_0_140px_30px"]${NOT_DARK} { box-shadow: none; }
${NIKE} .lift-card${NOT_DARK} { translate: none; }

/* Type: small UI words lose the caps and the tracking and weigh 600 (their
   12px floor is in the utilities layer above). Page titles (h1) keep their
   caps, like Nike's campaign lines; section headings are sentence case, bold,
   tracked in a hair. */
${NIKE} .uppercase${TYPE_EX} {
  text-transform: none;
}
${NIKE} ${anyOf(wideTracking)}${unless("h1", "h2", ...LOCKUP)}${NOT_DARK} {
  letter-spacing: 0;
}
${NIKE} .uppercase:is(.font-black, .font-extrabold, .font-bold)${unless("h1", "h2", ...LOCKUP)}${NOT_DARK} {
  font-weight: 600;
}
${NIKE} :is(h1, h2)${unless('[class*="tracking-tight"]', '[class*="tracking-[-"]')}${NOT_DARK} {
  letter-spacing: -0.01em;
}
${NIKE} h2${NOT_DARK} {
  font-weight: 700;
}
/* A product's name over its buy panel: bold, not black, a size down. */
${NIKE} h1.tracking-tight.lg\:text-4xl${NOT_DARK} {
  font-weight: 700;
  letter-spacing: -0.01em;
}
@media (width >= 64rem) {
  ${NIKE} h1.tracking-tight.lg\:text-4xl${NOT_DARK} {
    font-size: 30px;
    line-height: 1.2;
  }
}

/* Primary: a black pill, white words, no caps. */
${NIKE} ${PRIMARY} {
  border-radius: 9999px;
  color: #ffffff;
  font-weight: 600;
  letter-spacing: 0;
  text-transform: none;
}
${NIKE} ${PRIMARY} * {
  font-weight: 600;
  letter-spacing: 0;
  text-transform: none;
}
/* Secondary: a white pill on a 1.5px grey line that turns black under the
   pointer. */
${NIKE} ${SECONDARY} {
  background-color: var(--light-surface);
  border: 1.5px solid var(--light-line-strong);
  border-radius: 9999px;
  box-shadow: none;
  color: var(--light-ink);
  font-weight: 600;
}
${NIKE} ${SECONDARY}:hover {
  border-color: var(--light-ink);
}
/* The tall buy buttons (56px) carry Nike's 16px words, not 13px caps. */
${NIKE} :is(${PRIMARY}, ${SECONDARY}).h-14 {
  font-size: 16px;
}
${NIKE} ${ICON_BUTTON} {
  background-color: var(--nike-well);
  border-color: transparent;
  border-radius: 9999px;
  box-shadow: none;
}
${NIKE} ${ICON_BUTTON}:hover {
  background-color: var(--nike-well-hover);
}

/* Chips: a grey well when not picked; picked, white with a 1.5px black line,
   black bold words. */
${NIKE} ${CHIP_OFF} {
  background-color: var(--nike-well);
  border-color: transparent;
  border-radius: 9999px;
  box-shadow: none;
  color: var(--light-ink);
  font-weight: 500;
}
${NIKE} ${CHIP_OFF}:hover {
  background-color: var(--nike-well-hover);
}
${NIKE} ${CHIP_ON} {
  --color-white: #111111;
  background-color: var(--light-surface);
  border-color: transparent;
  border-radius: 9999px;
  box-shadow: inset 0 0 0 1.5px #111111;
  color: #111111;
  font-weight: 700;
}

/* Fields and searches: grey wells with no line, pill-round; a black line
   while typing. */
${NIKE} ${FIELD_SHELL}:has(> input, > textarea)${NOT_DARK},
${NIKE} ${HEADER_FIELD}${NOT_DARK} {
  background-color: var(--nike-well);
  border-color: transparent;
  border-radius: 9999px;
  box-shadow: none;
}
${NIKE} ${FIELD_SHELL}:has(> input:focus, > textarea:focus)${NOT_DARK}[class],
${NIKE} ${HEADER_FIELD}:has(input:focus)${NOT_DARK} {
  border-color: transparent;
  box-shadow: inset 0 0 0 1.5px #111111;
}
${NIKE} ${FIELD} {
  background-color: var(--nike-well);
  border-color: transparent;
}
${NIKE} ${FIELD}:focus {
  border-color: transparent;
  box-shadow: inset 0 0 0 1.5px #111111;
}
${NIKE} :is(input, textarea)${NOT_DARK}::placeholder { color: #707072; }
/* The tool card's package picker reads as a field. */
${NIKE} button.bg-\[\#111216\]${NOT_DARK} {
  background-color: var(--nike-well);
  border-color: transparent;
  border-radius: 9999px;
  color: var(--light-ink);
}

/* Header: white, one hairline, black words; the strip a #f5f5f5 band; the
   cart a round icon. The strip's links and the three menu triggers are typed
   in capitals, so they are lowered and their first letter raised (sentence
   case). A first letter needs a block box, so a strip link is a block (its
   words still centred in the 40px strip) instead of a flex box; a brand name
   inside one (.brand-word, "Telegram") is written as typed. */
${NIKE} .site-nav > div:first-child a {
  color: var(--light-ink);
  font-weight: 500;
  display: inline-block;
  align-content: center;
  text-transform: lowercase;
}
${NIKE} .site-nav > div:first-child a::first-letter { text-transform: uppercase; }
${NIKE} .site-nav > div:first-child a .brand-word { text-transform: none; }
${NIKE} .site-nav > div:first-child a:hover { text-decoration: underline; text-underline-offset: 3px; }
${NIKE} .site-nav button[aria-haspopup="true"].uppercase {
  display: block;
  font-size: 15px;
  font-weight: 500;
  color: var(--light-ink);
  text-transform: lowercase;
}
${NIKE} .site-nav button[aria-haspopup="true"].uppercase::first-letter { text-transform: uppercase; }
${NIKE} .site-nav button[aria-haspopup="true"].uppercase > svg {
  display: inline-block;
  vertical-align: -2px;
  margin-left: 6px;
}
${NIKE} .menzu-scroll-x button[aria-expanded].uppercase > span:first-child {
  display: inline-block;
  text-transform: lowercase;
}
${NIKE} .menzu-scroll-x button[aria-expanded].uppercase > span:first-child::first-letter { text-transform: uppercase; }
${NIKE} a[href="/"] .text-red-500 { color: var(--light-ink); }
${NIKE} .site-nav a.bg-\[\#17171c\] { background-color: transparent; border-color: transparent; border-radius: 9999px; }
${NIKE} .site-nav a.bg-\[\#17171c\]:hover { background-color: var(--nike-well-hover); }
/* On a phone the bar has no room for the 28px mark: it shrank to a sliver. */
@media (width < 40rem) {
  ${NIKE} .site-nav a[href="/"].origin-left > div.relative { display: none; }
}

/* Black navbar (the owner, 14/10/2026: "navbar đen đi chứ"): the bar and its
   strip are black with white words, the Nike white page under it. Inside the
   bar the dark palette comes back and the light tokens take dark values, so
   every rule above that paints with a token (the strip's links, the menu
   triggers, the logo's tail, fields, hairlines, the cart, the dropdowns)
   turns dark without a rule of its own. The accent there is white, and a
   white fill carries black words, as on Nike's black pages. */
${NIKE} .site-nav {
${restoreLines}
  --light-page: #111111;
  --light-surface: #111111;
  --light-surface-hover: #1f1f1f;
  --light-band: #000000;
  --light-line: rgb(255 255 255 / 0.12);
  --light-line-strong: rgb(255 255 255 / 0.22);
  --light-ink: #ffffff;
  --light-ink-2: #ffffff;
  --light-ink-3: #b5b5b8;
  --light-ink-4: #b5b5b8;
  --nike-well: #222222;
  --nike-well-hover: #2e2e2e;
  --ocean: #ffffff;
  --ocean-dark: #e5e5e5;
  --ocean-soft: #222222;
  --ocean-line: rgb(255 255 255 / 0.22);
  --brand: #ffffff;
  --brand-dark: #e5e5e5;
  --menzu-accent: #ffffff;
  --menzu-accent-dark: #e5e5e5;
  color-scheme: dark;
  background-color: #111111;
  box-shadow: none;
}
${NIKE} .site-nav > div:first-child {
  background-color: #000000;
  border-color: rgb(255 255 255 / 0.08);
}
${NIKE} .site-nav ${ACCENT_FILL}[class] {
  --color-white: #111111;
  color: #111111;
}

/* Footer: white with one line on top; black column titles, grey links. */
${NIKE} ${FOOTER} { background-color: var(--light-band); border-top-color: var(--light-line); }
${NIKE} ${FOOTER} h2${NOT_DARK} { font-size: 14px; font-weight: 600; color: var(--light-ink); }
${NIKE} ${FOOTER} a${unless('[class*="text-[var(--menzu-accent)]"]')}${NOT_DARK} { color: var(--light-ink-3); }
${NIKE} ${FOOTER} a${NOT_DARK}:hover { color: var(--light-ink); }

/* Links: black, underlined under the pointer. */
${NIKE} a:is([class*="text-[var(--menzu-accent)]"], [class*="hover:text-white"], ${FOOTER} a):hover${NOT_DARK} {
  text-decoration: underline;
  text-underline-offset: 3px;
}

/* Product cards: no box, no lift; the picture square on a grey well, the
   words flush with it. Names may take two lines. */
${NIKE} ${CARD} {
  background-color: transparent;
  border-color: transparent;
  border-radius: 0;
  box-shadow: none;
}
${NIKE} ${CARD} :is(.aspect-\[16\/9\], .aspect-\[16\/10\]) {
  border-radius: 0;
  background: var(--nike-well);
}
${NIKE} ${CARD} > div.p-4 {
  padding-left: 0;
  padding-right: 0;
}
${NIKE} ${CARD} h3.truncate {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  white-space: normal;
  font-size: 16px;
  font-weight: 600;
}

/* Rating stars in black, as Nike draws them. */
${NIKE} .fill-amber-400${NOT_DARK} { color: #111111; fill: #111111; }

/* Write-ups: links black and underlined (inline, they need more than colour);
   numbers in the secondary grey; a quote on the well with a black rule. */
${NIKE} .doc-prose${unless(".keep-dark *")} a { color: #111111; text-decoration: underline; text-underline-offset: 3px; }
${NIKE} .doc-prose${unless(".keep-dark *")} a:hover { color: #707072; }
${NIKE} .doc-prose${unless(".keep-dark *")} li::marker { color: #707072; }
${NIKE} .doc-prose${unless(".keep-dark *")} blockquote { border-left-color: #111111; background-color: var(--nike-well); }
${nikeInlineCss}
`;

// ---- 6. The "moi" variant (TRIAL) -----------------------------------------
// The owner (14/10/2026): "Biến tấu sao cho đẹp hơn đi ở bản sáng", "Má xấu
// quá nhìn khó chịu thiệt đó", and before that "đẹp hiện đại chuyên nghiệp
// không có rối", "làm sao bớt chói đi", "tone trắng kết hợp xanh biển" and
// "navbar đen đi chứ". The earlier light dresses repainted a dark design; this
// one changes how the blocks are built on a light page: picture tiles become
// white cards with the picture on top and the name in a caption bar under it,
// the hero loses its empty band, product cards lose the clutter on the
// picture, the type is sentence case and bold instead of spaced black
// capitals, and the navbar is near-black. It is the "d2" design picked from
// three (clean SaaS-commerce: Linear, Vercel, Stripe), with the judge's grafts.
//
// ?giao-dien=moi sets data-theme="light" AND data-variant="moi" on <html>, so
// every rule sits under both and the dark site, the ocean dress and the Nike
// trial never match one. ?giao-dien=moi-den adds data-footer="den": the same
// dress with the near-black footer in place of the soft band, for the owner
// to compare.
//
// Blocks are reached through hook classes the components carry for this
// (home-hero, hero-sky, scroll-cta, category-hero, category-hero-art,
// row-tile, bento-tile, featured-*, tile-pill, tile-scrim, tile-caption,
// row-heading, row-view-all, tool-card, acc-card, tool-status,
// tool-status-line, tool-more, nav-item-label, product-top, crumb-current,
// crumb-sep), not through their Tailwind strings. Names typed in capitals get
// their sentence-case form in data-soft from CaseText (case-typed), which only
// this dress draws; the helper keeps CS2, ESP, PC, MS, HVH and the other acronyms.

const MOI = `html[data-theme="light"][data-variant="moi"]`;
// The near-black bar (and the near-black footer of ?giao-dien=moi-den): the
// dark palette restored inside, the light tokens given dark values, so every
// rule above that paints with a token turns dark there without a rule of its
// own. The accent stays the ocean blue for the solid buttons (Đăng nhập);
// words and links in the accent take a light blue that reads on black.
const MOI_DARK = `${restoreLines}
  /* Dim words (the dark site's 500 and 600 greys) on the near-black: 7.9:1. */
  --color-neutral-500: #9aa7ba;
  --color-neutral-600: #9aa7ba;
  --color-zinc-500: #9aa7ba;
  --color-zinc-600: #9aa7ba;
  --color-gray-500: #9aa7ba;
  --color-gray-600: #9aa7ba;
  --color-slate-500: #9aa7ba;
  --color-slate-600: #9aa7ba;
  --light-page: #0b0f17;
  --light-surface: #121826;
  --light-surface-hover: #182032;
  --light-band: #07090e;
  --light-line: rgb(255 255 255 / 0.09);
  --light-line-strong: rgb(255 255 255 / 0.16);
  --light-ink: #ffffff;
  --light-ink-2: #e6edf7;
  --light-ink-3: #a9b6c9; /* 9.3:1 on the bar, 9.7:1 on the strip */
  --light-ink-4: #a9b6c9;
  --ocean: #7cbcff; /* 9.6:1 on the bar */
  --ocean-dark: #a6d2ff;
  --ocean-soft: #182032;
  --ocean-line: rgb(124 188 255 / 0.35);
  --menzu-accent: #0b63b6;
  --menzu-accent-dark: #084f93;
  --brand: #0b63b6;
  --brand-dark: #084f93;
  color-scheme: dark;`;
// Inside a picture tile (a .keep-dark island) the light palette comes back:
// the tile is a white card now, so its words are ink, not white. One class
// more than the islands rule, which it must outrank.
const MOI_TILES = String.raw`:is(.row-tile, .bento-tile, .featured-tile).keep-dark[class]`;
const MOI_CARDS = ":is(.tool-card, .acc-card)";
const moiInlineCss = Object.entries({ "#ff0000": "#d30005", red: "#d30005", "#ffff00": "#92400e" })
  .map(([color, value]) => {
    const needles =
      color === "red"
        ? ["color: red", "color:red"]
        : (() => {
            const rgb = [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16)).join(", ");
            return [`color: ${color}`, `color:${color}`, `color: rgb(${rgb})`, `color:rgb(${rgb})`];
          })();
    const selectors = needles.map((needle) => `${MOI} .doc-prose${unless(".keep-dark *")} [style*="${needle}" i]`);
    return `${selectors.join(",\n")} {\n  color: ${value} !important;\n}`;
  })
  .join("\n");

const moiCss = String.raw`/* 6. MOI (TRIAL, 14/10/2026): white and ocean blue, a near-black navbar,
   calm cards (the owner: "đẹp hiện đại chuyên nghiệp không có rối"). On only
   under html[data-variant="moi"] (?giao-dien=moi); the dark site, the ocean
   dress and the Nike trial never match these rules. */

/* ---- Tokens: a soft cool page (not pure white, "bớt chói"), white cards,
   one hairline, navy ink, one blue. ---- */
${MOI} {
  --light-page: #f4f6fa;
  --light-surface: #ffffff;
  --light-surface-hover: #f1f5fa;
  --light-line: #e3e8ef;
  --light-line-strong: #cfd8e3;
  --light-band: #ffffff;
  --light-ink: #0b1526;
  --light-ink-2: #334155;
  --light-ink-3: #5a6577; /* 5.45:1 on the page, 5.89:1 on white */
  --light-ink-4: #627084; /* 4.65:1 on the page */
  --ocean: #0b63b6;
  --ocean-dark: #084f93;
  --ocean-soft: #ebf4fd;
  --ocean-line: #bfd8f2;
  --ocean-ring: rgb(11 99 182 / 0.16);
  --brand: #0b63b6;
  --brand-dark: #084f93;
  --menzu-accent: #0b63b6;
  --menzu-accent-dark: #084f93;
  --moi-black: #0b0f17; /* the navbar */
  --moi-black-2: #07090e; /* its top strip */
  --moi-band: #eef2f7; /* the footer */
  --moi-grad: linear-gradient(135deg, #0b63b6 0%, #0a6aa8 55%, #0e7490 100%);
  --moi-grad-hover: linear-gradient(135deg, #084f93 0%, #0a5b8f 55%, #0b5f77 100%);
  --moi-shadow-xs: 0 1px 2px rgb(11 21 38 / 0.05);
  --moi-shadow-sm: 0 1px 2px rgb(11 21 38 / 0.04), 0 2px 6px -2px rgb(11 21 38 / 0.06);
  --moi-shadow-lift: 0 1px 2px rgb(11 21 38 / 0.05), 0 16px 32px -18px rgb(11 50 100 / 0.32);
  --moi-radius: 16px;
  --float-shadow: 0 2px 6px rgb(11 21 38 / 0.06), 0 18px 44px -18px rgb(11 21 38 / 0.24);
  /* Muted greys that still read on the page grey. */
  --color-neutral-500: #5a6577;
  --color-zinc-500: #5a6577;
  --color-gray-500: #5a6577;
  --color-slate-500: #5a6577;
  --color-neutral-600: #627084;
  --color-zinc-600: #627084;
  --color-gray-600: #627084;
  --color-slate-600: #627084;
}
${MOI} body { background-color: var(--light-page); }

/* Names typed in capitals: their sentence-case form (CaseText's data-soft) is
   drawn here in place of the typed name, and whatever holds one is not set in
   capitals by CSS (a page title included). */
${MOI} .case-typed[data-soft] > .case-text { display: none; }
${MOI} .case-typed[data-soft]::after { content: attr(data-soft); text-transform: none; }
${MOI} :has(> .case-typed[data-soft]) { text-transform: none; }
${MOI} h1:has(> .case-typed[data-soft]) { letter-spacing: -0.02em; }

/* Grey 700 as text (the "VNĐ" beside an empty top-up amount, a pager's dots):
   the light flip makes it a hairline grey, 1.5:1 on white, so as words it
   takes the dim grey (5.0:1 on white); an inactive control keeps its own. */
${MOI} ${anyOf(dimText)}${unless(":disabled", '[aria-disabled="true"]', ".cursor-default", ".cursor-not-allowed")}${NOT_ISLAND} { color: var(--light-ink-4); }

/* Crisper type: the dark site's 900 weight and spaced capitals turn into bold
   sentence-case UI words. Page titles and the logo keep theirs. */
${MOI} .font-black:not(h1, .keep-dark *, a[href="/"].group *) { font-weight: 700; }
${MOI} .font-extrabold:not(h1, .keep-dark *, a[href="/"].group *) { font-weight: 650; }
${MOI} .uppercase:not(h1, .keep-dark *, a[href="/"].group *, .-rotate-45, .site-nav *) {
  text-transform: none;
  letter-spacing: 0;
}
${MOI} :is(.tracking-widest, .tracking-wider, .tracking-wide, [class*="tracking-[0."]):not(h1, .keep-dark *, a[href="/"].group *, .-rotate-45, .site-nav *) {
  letter-spacing: 0;
}

/* ---- Header: near-black (the owner: "navbar đen đi chứ"), the dark palette
   inside, the blue Đăng nhập kept. ---- */
${MOI} .site-nav {
${MOI_DARK}
  color: #e6edf7;
  background-color: var(--moi-black);
  box-shadow: 0 1px 0 rgb(255 255 255 / 0.04), 0 10px 28px -16px rgb(0 0 0 / 0.55);
  backdrop-filter: none;
}
${MOI} .site-nav > div:first-child {
  background-color: var(--moi-black-2);
  border-bottom-color: rgb(255 255 255 / 0.06);
}
${MOI} .site-nav > div:first-child a { color: #a9b6c9; }
${MOI} .site-nav > div:first-child a:hover { color: #ffffff; }
${MOI} .site-nav a[href="/"] .text-red-500 { color: #7cbcff; }
${MOI} .site-nav .text-\[var\(--menzu-accent\)\] { color: #7cbcff; }
${MOI} .site-nav button[aria-haspopup="true"] { color: #e6edf7; }
/* The strip and the three menus in sentence case. Their words are typed in
   capitals in the source, so they are lowered and the first letter raised (a
   first letter needs a block box); a brand name (.brand-word) as typed. */
${MOI} .site-nav > div:first-child a {
  display: inline-block;
  align-content: center;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0;
  text-transform: lowercase;
}
${MOI} .site-nav > div:first-child a::first-letter { text-transform: uppercase; }
${MOI} .site-nav > div:first-child a .brand-word { text-transform: none; }
${MOI} .site-nav button[aria-haspopup="true"].uppercase {
  display: block;
  font-size: 14px;
  font-weight: 550;
  letter-spacing: 0;
  text-transform: lowercase;
}
${MOI} .site-nav button[aria-haspopup="true"].uppercase::first-letter { text-transform: uppercase; }
${MOI} .site-nav button[aria-haspopup="true"].uppercase > svg { display: inline-block; vertical-align: -3px; margin-left: 6px; }
${MOI} .site-nav button[aria-haspopup="true"].uppercase:hover { color: #ffffff; background-color: rgb(255 255 255 / 0.06); }
/* The dropdowns' rows: the sentence-case twins, 13px. */
${MOI} .site-nav .nav-item-label {
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0;
  text-transform: none;
}
${MOI} .site-nav a.bg-\[var\(--brand\)\] { border-radius: 10px; box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.14); }
${MOI} .site-nav a.bg-\[var\(--brand\)\] * { text-transform: none; letter-spacing: 0; font-weight: 600; font-size: 13px; }
${MOI} .site-nav a.bg-\[\#17171c\] { background-color: rgb(255 255 255 / 0.06); border-color: rgb(255 255 255 / 0.1); }

/* ---- Home hero: a compact split, a soft blue wash behind the video. No
   starfield and no scroll cue (they come out of the component when this
   dress ships). ---- */
${MOI} .home-hero {
  min-height: 0;
  padding-top: 8px;
  padding-bottom: 8px;
  overflow: visible;
}
${MOI} .home-hero > .hero-sky,
${MOI} .home-hero .scroll-cta { display: none; }
${MOI} .home-hero::before {
  content: "";
  position: absolute;
  z-index: 0;
  pointer-events: none;
  inset: -60px -12vw -40px 30%;
  background:
    radial-gradient(50% 58% at 60% 46%, rgb(11 99 182 / 0.22), rgb(11 99 182 / 0) 72%),
    radial-gradient(34% 42% at 86% 78%, rgb(14 140 170 / 0.18), rgb(14 140 170 / 0) 72%);
}
${MOI} .home-hero > .relative.z-10 { align-items: center; }
${MOI} .home-hero [class*="0_0_140px_30px"] {
  border-radius: 20px;
  border-color: rgb(11 21 38 / 0.08);
  box-shadow: 0 0 0 6px rgb(255 255 255 / 0.85), 0 0 0 7px var(--light-line), 0 40px 70px -40px rgb(11 60 120 / 0.45);
}
${MOI} .home-hero .animate-fade-up.rounded-full {
  margin-left: 0;
  background-color: var(--ocean-soft);
  border-color: var(--ocean-line);
  color: #084f93;
  font-size: 12px;
  font-weight: 600;
  backdrop-filter: none;
}
${MOI} .home-hero span.animate-fade-up.block {
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0;
  text-transform: none;
  color: var(--ocean);
  margin-top: 4px;
}
${MOI} .home-hero h1 {
  color: var(--light-ink);
  font-weight: 800;
  letter-spacing: -0.035em;
}
${MOI} .home-hero p {
  color: var(--light-ink-3);
  font-size: 16px;
  line-height: 1.65;
}
${MOI} .home-hero .mt-8 > a {
  height: 48px;
  border-radius: 12px;
  padding: 0 22px;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0;
  text-transform: none;
}

/* ---- Primary buttons: the one gradient. ---- */
${MOI} :is(a, button):is(.bg-\[var\(--menzu-accent\)\], .bg-\[var\(--brand\)\]):not([aria-pressed], [aria-selected], [aria-current], .keep-dark *, .-rotate-45, .site-nav *) {
  background-image: var(--moi-grad);
  border-color: transparent;
  box-shadow: 0 1px 2px rgb(11 21 38 / 0.12), 0 6px 16px -8px rgb(11 99 182 / 0.55), inset 0 1px 0 rgb(255 255 255 / 0.14);
}
${MOI} :is(a, button):is(.bg-\[var\(--menzu-accent\)\], .bg-\[var\(--brand\)\]):not([aria-pressed], [aria-selected], [aria-current], .keep-dark *, .-rotate-45, .site-nav *):hover {
  background-image: var(--moi-grad-hover);
}
/* Quiet buttons: white, hairline, ink words. */
${MOI} :is(a, button):is(.bg-white\/\[0\.04\], .bg-white\/\[0\.07\], .bg-white\/\[0\.08\]):not(.keep-dark *, .site-nav *) {
  background-color: #ffffff;
  border: 1px solid var(--light-line-strong);
  box-shadow: var(--moi-shadow-xs);
  color: var(--light-ink);
}
${MOI} :is(a, button):is(.bg-white\/\[0\.04\], .bg-white\/\[0\.07\], .bg-white\/\[0\.08\]):not(.keep-dark *, .site-nav *):hover {
  background-color: var(--light-surface-hover);
  border-color: #b8c4d4;
}

/* ---- Row headings: no accent bar, sentence case (CaseText), bold. ---- */
${MOI} :is(div, span).w-\[3px\].bg-\[var\(--menzu-accent\)\] { display: none; }
${MOI} .row-heading {
  font-size: 26px;
  font-weight: 750;
  letter-spacing: -0.025em;
  text-transform: none;
  color: var(--light-ink);
}
${MOI} .row-view-all {
  border-bottom: 0;
  color: var(--ocean);
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0;
  text-transform: none;
}
${MOI} .row-view-all:hover { color: var(--ocean-dark); }

/* ---- Picture tiles (RowTile in every style, BentoTile): the picture on
   top, a white caption bar under it, no scrim, no words over the picture. ---- */
${MOI} ${MOI_TILES} {
${flipLines}
  --menzu-accent: var(--ocean);
  --menzu-accent-dark: var(--ocean-dark);
  --brand: var(--ocean);
  --brand-dark: var(--ocean-dark);
  color-scheme: light;
}
${MOI} :is(.row-tile, .bento-tile) {
  aspect-ratio: auto;
  height: 100%; /* tiles in one row end level, whatever their caption holds */
  display: flex;
  flex-direction: column;
  background-color: #ffffff;
  border: 1px solid var(--light-line);
  border-radius: var(--moi-radius);
  box-shadow: var(--moi-shadow-sm);
  transition: box-shadow 0.2s ease, border-color 0.2s ease, translate 0.2s ease;
}
${MOI} :is(.row-tile, .bento-tile):hover {
  border-color: #c7d4e5;
  box-shadow: var(--moi-shadow-lift);
  translate: 0 -2px;
}
${MOI} :is(.row-tile, .bento-tile) > .card-image-in {
  position: relative;
  inset: auto;
  flex: none;
  width: 100%;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  background-color: #e9eef5;
}
/* A bento tile's height is set by its grid (or its own 16:11 on a phone):
   the picture takes what the caption leaves. */
${MOI} .bento-tile > .card-image-in {
  flex: 1 1 auto;
  min-height: 0;
  aspect-ratio: auto;
}
/* Styles a, b and c dim the cover; on a white card it stays clear. */
${MOI} :is(.row-tile, .bento-tile) > .card-image-in > img { filter: none; }
${MOI} :is(.row-tile, .bento-tile) > .tile-scrim { display: none; }
${MOI} :is(.row-tile, .bento-tile) > .tile-caption {
  position: static;
  inset: auto;
  padding: 12px 14px 13px;
  background-color: transparent;
  border: 0;
  backdrop-filter: none;
}
${MOI} :is(.row-tile, .bento-tile) > .tile-caption :is(h3, span, p) { letter-spacing: 0; text-transform: none; }
/* The name: ink, 15px, bold; one line in a caption bar. */
${MOI} :is(.row-tile > h3.tile-caption, :is(.row-tile, .bento-tile) > .tile-caption h3) {
  color: var(--light-ink);
  font-size: 15px;
  font-weight: 650;
  line-height: 1.3;
  letter-spacing: -0.01em;
}
/* Its quiet line (the price, the count, the blurb) and the style-b eyebrow. */
${MOI} :is(.row-tile, .bento-tile) > .tile-caption :is(span, p):not(.case-typed, .case-text, [class*="bg-"]) {
  color: var(--light-ink-3);
  font-size: 12px;
  font-weight: 500;
}
${MOI} .row-tile > .tile-caption > span.text-\[var\(--menzu-accent\)\] { color: var(--ocean); font-weight: 600; }
/* The classic caption is the name alone: an arrow at its end. */
${MOI} .row-tile > h3.tile-caption {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
${MOI} .row-tile > h3.tile-caption::after {
  content: "";
  flex: none;
  width: 16px;
  height: 16px;
  background-color: #8a96a8; /* decoration, the name carries the link */
  -webkit-mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M5 12h14M13 6l6 6-6 6'/%3E%3C/svg%3E") center / contain no-repeat;
          mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M5 12h14M13 6l6 6-6 6'/%3E%3C/svg%3E") center / contain no-repeat;
  transition: background-color 0.2s ease, translate 0.2s ease;
}
${MOI} .row-tile:hover > h3.tile-caption::after { background-color: var(--ocean); translate: 2px 0; }
/* The large bento tile: a bigger name, its blurb, the small blue button. */
@media (width >= 40rem) {
  ${MOI} .bento-tile.col-span-2 > .tile-caption { padding: 18px 20px 20px; gap: 8px; }
  ${MOI} .bento-tile.col-span-2 > .tile-caption h3 { font-size: 22px; line-height: 1.2; }
}
${MOI} .bento-tile > .tile-caption > span[class*="bg-[var(--menzu-accent)]"] {
  padding: 8px 14px;
  border-radius: 10px;
  color: #ffffff;
  font-size: 13px;
  font-weight: 600;
}
/* The month's pill over the picture: a white chip. */
${MOI} .row-tile > .tile-pill {
  background-color: rgb(255 255 255 / 0.94);
  color: var(--light-ink);
  --tw-ring-color: rgb(11 21 38 / 0.06);
  font-size: 11px;
  font-weight: 650;
  letter-spacing: 0;
  text-transform: none;
  border-radius: 999px;
  padding: 4px 9px;
  backdrop-filter: none;
}
${MOI} .row-tile > .tile-pill svg { color: #e8920a; }

/* Featured categories (the character cards, off on the home page today): a
   white card, a soft blue ground behind the art instead of the dark one, the
   names in ink on a white caption band, a plain "Xem chi tiết" link. */
${MOI} .featured-tile :is(.featured-edge, .featured-fill) { clip-path: none; border-radius: 16px; }
${MOI} .featured-tile .featured-fill { border-radius: 14.5px; }
${MOI} .featured-tile .featured-edge { background-color: var(--light-line); }
${MOI} .featured-tile:hover .featured-edge { background-color: var(--ocean-line); }
${MOI} .featured-tile .featured-fill { background: linear-gradient(180deg, #f3f8fe 0%, #dcebfb 100%); }
${MOI} .featured-tile .featured-fill > * { display: none; }
${MOI} .featured-tile .featured-frame { padding: 0 1.5px 1.5px; }
${MOI} .featured-tile .featured-caption {
  padding: 12px 10px 14px;
  background-color: #ffffff;
  border-top: 1px solid var(--light-line);
  border-radius: 0 0 14px 14px;
  color: var(--light-ink);
}
${MOI} .featured-tile .featured-caption > div:first-child { margin-bottom: 6px; }
${MOI} .featured-tile .featured-caption > div:first-child > span:first-child {
  color: var(--ocean);
  font-size: 12px;
  margin-bottom: 4px;
}
${MOI} .featured-tile .featured-caption > div:first-child > span:last-child {
  font-size: clamp(22px, 3vw, 30px);
  color: var(--light-ink);
}
${MOI} .featured-tile .featured-cta,
${MOI} .featured-tile .featured-cta > div,
${MOI} .featured-tile .featured-cta > div > div {
  min-width: 0;
  margin: 0;
  padding: 0;
  background: none;
  clip-path: none;
  filter: none;
  scale: none;
}
${MOI} .featured-tile .featured-cta span {
  color: var(--ocean);
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0;
  text-transform: none;
}

/* The sliding row (Hot trending) fades out on the right only: a fade on the
   left ate the first letters of a caption. */
${MOI} .row-slider-viewport {
  mask-image: linear-gradient(to right, #000 calc(100% - 72px), transparent);
}

/* ---- Stats strip. ---- */
${MOI} [aria-label="Số liệu của shop"] > div {
  background-color: #ffffff;
  border-color: var(--light-line);
  border-radius: var(--moi-radius);
  box-shadow: var(--moi-shadow-sm);
}
${MOI} [aria-label="Số liệu của shop"] > div > div { border-color: var(--light-line); }
${MOI} [aria-label="Số liệu của shop"] span.font-black.text-white { color: var(--light-ink); font-weight: 750; letter-spacing: -0.03em; }
${MOI} [aria-label="Số liệu của shop"] span.uppercase {
  font-size: 13px;
  font-weight: 500;
  color: var(--light-ink-3);
  letter-spacing: 0;
  text-transform: none;
}

/* ---- Search field, platform segmented control, counters. ---- */
${MOI} label.group\/search {
  background-color: #ffffff;
  border-radius: 12px;
  box-shadow: inset 0 0 0 1px var(--light-line-strong), var(--moi-shadow-xs);
}
${MOI} label.group\/search:focus-within {
  box-shadow: inset 0 0 0 1px var(--ocean), 0 0 0 3px var(--ocean-ring);
}
${MOI} [role="group"][aria-label="Phân loại"] {
  display: inline-flex;
  align-self: flex-start;
  gap: 2px;
  padding: 4px;
  border-radius: 12px;
  background-color: #e9eef5;
  box-shadow: inset 0 0 0 1px var(--light-line);
}
${MOI} [role="group"][aria-label="Phân loại"] > button {
  height: 34px;
  min-width: 0;
  padding: 0 16px;
  border-radius: 9px;
  background: transparent;
  box-shadow: none;
  color: var(--light-ink-3);
  font-size: 13px;
  font-weight: 600;
}
${MOI} [role="group"][aria-label="Phân loại"] > button:hover { color: var(--light-ink); background: rgb(255 255 255 / 0.6); }
${MOI} [role="group"][aria-label="Phân loại"] > button[aria-pressed="true"] {
  --color-white: var(--light-ink);
  background-color: #ffffff;
  border-color: transparent;
  color: var(--light-ink);
  box-shadow: 0 1px 2px rgb(11 21 38 / 0.08), 0 0 0 1px rgb(11 21 38 / 0.04);
}
${MOI} p[aria-live="polite"].uppercase {
  font-size: 13px;
  font-weight: 500;
  color: var(--light-ink-3);
}

/* ---- Footer: a soft cool band, so the page has a clear end (not white on
   white). ?giao-dien=moi-den draws it near-black like the navbar instead. ---- */
${MOI} ${FOOTER} {
  background-color: var(--moi-band);
  border-top-color: var(--light-line);
}
${MOI} ${FOOTER} h2 {
  font-size: 14px;
  font-weight: 650;
  color: var(--light-ink);
}
${MOI} ${FOOTER} :is(.text-neutral-600, .text-zinc-600, .text-slate-600, .text-gray-600) {
  color: var(--light-ink-3); /* 5.2:1 on the band */
}
${MOI}[data-footer="den"] ${FOOTER} {
${MOI_DARK}
  color: #e6edf7;
  background-color: var(--moi-black);
  border-top-color: rgb(255 255 255 / 0.06);
}
${MOI}[data-footer="den"] ${FOOTER} h2 { color: #ffffff; }
${MOI}[data-footer="den"] ${FOOTER} .text-\[var\(--menzu-accent\)\] { color: #7cbcff; }
${MOI}[data-footer="den"] ${FOOTER} a:hover { color: #ffffff; }

/* Games with nothing on sale (/categories): the card stays crisp, the
   picture goes quiet, full colour under the pointer. */
${MOI} .opacity-45.transition-opacity { opacity: 1; }
${MOI} .opacity-45.transition-opacity .row-tile > .card-image-in { opacity: 0.5; filter: grayscale(0.7); transition: opacity 0.2s ease, filter 0.2s ease; }
${MOI} .opacity-45.transition-opacity .row-tile:hover > .card-image-in { opacity: 1; filter: none; }
${MOI} .opacity-45.transition-opacity .row-tile > h3.tile-caption { color: var(--light-ink-3); font-weight: 600; }

/* ---- Home rhythm: no hairline dividers, even section beats. ---- */
${MOI} section.before\:w-screen { padding-top: 0; }
${MOI} section.before\:w-screen::before { display: none; }
@media (width >= 40rem) {
  ${MOI} .space-y-12.sm\:space-y-20 > :not(:last-child) { margin-block-end: 88px; }
}
${MOI} section.before\:w-screen h2 {
  font-weight: 750;
  letter-spacing: -0.025em;
  color: var(--light-ink);
}

/* ---- Category header: the title left, the game's art as a framed card on
   the right (from 1024px), a soft blue wash. ---- */
${MOI} .category-hero {
  min-height: 0;
  padding-bottom: 28px;
  overflow: visible;
}
${MOI} .category-hero > .category-hero-art,
${MOI} .category-hero > .category-hero-art > div { display: none; }
${MOI} .category-hero::before {
  content: "";
  position: absolute;
  z-index: -1;
  pointer-events: none;
  inset: 0 0 -60px 0;
  background:
    radial-gradient(40% 70% at 82% 40%, rgb(11 99 182 / 0.13), rgb(11 99 182 / 0) 72%),
    radial-gradient(30% 50% at 98% 90%, rgb(14 140 170 / 0.12), rgb(14 140 170 / 0) 72%);
}
@media (width >= 64rem) {
  ${MOI} .category-hero > .category-hero-art {
    display: block;
    z-index: 1;
    inset: auto;
    top: 128px;
    right: max(24px, calc((100% - 1272px) / 2));
    width: 340px;
    aspect-ratio: 16 / 9;
    border-radius: 16px;
    overflow: hidden;
    background-color: #e9eef5;
    box-shadow: 0 0 0 5px rgb(255 255 255 / 0.9), 0 0 0 6px var(--light-line), 0 30px 50px -30px rgb(11 60 120 / 0.45);
  }
  ${MOI} .category-hero > .category-hero-art img { object-position: center; }
  ${MOI} .category-hero > .relative.z-10 { padding-right: calc(340px + 64px); min-height: 200px; }
}
${MOI} .category-hero h1 {
  color: var(--light-ink);
  font-weight: 800;
  letter-spacing: -0.03em;
  text-transform: none;
}
${MOI} .category-hero p { color: var(--light-ink-3); font-size: 15px; line-height: 1.65; }

/* Breadcrumb pill: a quiet white chip. */
${MOI} nav.rounded-full[class*="bg-[#111111]"] {
  background-color: #ffffff;
  border-color: var(--light-line);
  box-shadow: var(--moi-shadow-xs);
  font-weight: 500;
}

/* ---- Tool and account cards: white, hairline; a tool card has one action
   row, its status as a small coloured line over the name (not a pill on the
   picture), and no "Xem chi tiết" (the picture and the name already open the
   page; the button comes out of the component when this dress ships). ---- */
${MOI} ${MOI_CARDS} {
  background-color: #ffffff;
  border-color: var(--light-line);
  border-radius: var(--moi-radius);
  box-shadow: var(--moi-shadow-sm);
}
${MOI} ${MOI_CARDS}:hover {
  translate: 0 -2px;
  border-color: #c7d4e5;
  box-shadow: var(--moi-shadow-lift);
}
${MOI} .tool-card .rounded-t-\[14px\] { border-radius: 15px 15px 0 0; }
${MOI} .tool-card .tool-status { display: none; }
${MOI} .tool-card .tool-status-line {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0 0 6px;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.4;
}
${MOI} .tool-card .tool-status-line > span { width: 7px; height: 7px; }
${MOI} .tool-card h3 {
  white-space: normal;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  font-size: 14px;
  font-weight: 650;
  line-height: 1.4;
  letter-spacing: 0.005em;
  color: var(--light-ink);
}
${MOI} .tool-card h3:hover { color: var(--ocean); }
${MOI} .tool-card p.min-h-\[37px\] { min-height: 0; margin-bottom: 12px; color: var(--light-ink-3); }
${MOI} .tool-card p.min-h-\[37px\]:empty { display: none; }
${MOI} .tool-card .tool-more { display: none; }
${MOI} .tool-card :is(button, a).h-\[42px\] { height: 40px; border-radius: 10px; font-size: 13px; font-weight: 600; }
${MOI} .tool-card button.bg-\[\#111216\] {
  background-color: #ffffff;
  border-color: var(--light-line-strong);
  color: var(--light-ink-2);
  font-size: 13px;
  font-weight: 500;
}
${MOI} .tool-card button.bg-\[\#111216\]:hover { border-color: var(--ocean-line); background-color: var(--light-surface-hover); }
/* Room between a card's name and its actions. */
${MOI} .tool-card > div.p-4 { padding: 14px 16px 16px; }
${MOI} .tool-card > div.p-4 > .mt-auto { padding-top: 14px; }

/* ---- Tool page: the write-up in a white sheet. ---- */
${MOI} section.mt-14.scroll-mt-\[120px\] {
  margin-top: 48px;
  margin-bottom: 56px;
  padding: 36px 40px 40px;
  background-color: #ffffff;
  border: 1px solid var(--light-line);
  border-radius: 20px;
  box-shadow: var(--moi-shadow-sm);
}
${MOI} section.mt-14.scroll-mt-\[120px\] h2 { font-size: 24px; font-weight: 750; letter-spacing: -0.02em; color: var(--light-ink); }
/* Its subheads are typed in sentence case: the capitals were CSS. */
${MOI} section.mt-14.scroll-mt-\[120px\] h3.uppercase {
  font-size: 17px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--light-ink);
}
${MOI} section.mt-14.scroll-mt-\[120px\] .doc-prose { max-width: 820px; }
@media (width < 40rem) {
  ${MOI} section.mt-14.scroll-mt-\[120px\] { padding: 24px 18px 28px; border-radius: 16px; }
}
${MOI} h1.tracking-tight.lg\:text-4xl {
  color: var(--light-ink);
  font-weight: 750;
  letter-spacing: -0.02em;
}
@media (width >= 64rem) {
  ${MOI} h1.tracking-tight.lg\:text-4xl { font-size: 30px; line-height: 1.22; }
}
/* The tall buy buttons carry 15px words. */
${MOI} :is(a, button):is(.h-12, .h-14):is(.bg-\[var\(--menzu-accent\)\], .bg-\[var\(--brand\)\], [class*="border-[var(--menzu-accent)]"]):not(.keep-dark *) {
  font-size: 15px;
  font-weight: 600;
  border-radius: 12px;
}

/* ---- Articles: breadcrumb and title on a 960px column; the body on a white
   sheet, read in a 760px measure at 16px / 1.75, screenshots rounded,
   captions centred. ---- */
${MOI} .max-w-\[1320px\].py-12:has(> article) { max-width: 960px; }
${MOI} .max-w-\[1320px\].py-12 > article {
  padding: 40px 48px 48px;
  background-color: #ffffff;
  border: 1px solid var(--light-line);
  border-radius: 20px;
  box-shadow: var(--moi-shadow-sm);
}
${MOI} .max-w-\[1320px\].py-12 > article > :is(.doc-prose, .max-w-3xl, .aspect-\[16\/9\]) {
  max-width: 760px;
  margin-inline: auto;
}
${MOI} .max-w-\[1320px\].py-12 > article > .aspect-\[16\/9\] { border: 0; border-radius: 14px; }
${MOI} .max-w-\[1320px\].py-12 > article > .doc-prose { font-size: 16px; line-height: 1.75; }
${MOI} .max-w-\[1320px\].py-12 > article > .doc-prose :is(p, li) { font-size: 16px; line-height: 1.75; }
${MOI} .max-w-\[1320px\].py-12 > article > .doc-prose figcaption { font-size: 13px; text-align: center; }
@media (width < 40rem) {
  ${MOI} .max-w-\[1320px\].py-12 > article { padding: 22px 16px 28px; border-radius: 16px; }
}
${MOI} .doc-prose { font-size: 15px; line-height: 1.75; }
${MOI} .doc-prose h2 { letter-spacing: -0.02em; }
${MOI} .doc-prose img { border-radius: 12px; }

/* ---- Phones. ---- */
@media (width < 40rem) {
  /* The bar is 64px there (the strip hides), but every page kept 104px for
     it: a 40px empty band. The category header was pulled up by the same
     104px, so it follows. */
  ${MOI} div.w-full.shrink-0.h-\[104px\] { height: 64px; }
  ${MOI} .category-hero { margin-top: -64px; padding-top: 112px; }
  /* Two equal hero buttons on one row. */
  ${MOI} .home-hero .mt-8 { flex-wrap: nowrap; width: 100%; gap: 10px; margin-top: 24px; }
  ${MOI} .home-hero .mt-8 > a { flex: 1 1 0; justify-content: center; padding: 0 12px; font-size: 14px; }
  ${MOI} .home-hero p { font-size: 15px; }
  /* The platform control stays one row. */
  ${MOI} [role="group"][aria-label="Phân loại"] { flex-wrap: nowrap; align-self: stretch; }
  ${MOI} [role="group"][aria-label="Phân loại"] > button { flex: 1 1 auto; padding: 0 8px; gap: 6px; }
  ${MOI} :is(.row-heading, section.before\:w-screen h2) { font-size: 22px; }
  ${MOI} .row-view-all { font-size: 13px; white-space: nowrap; }
  /* Two tiles a row: a size down and a little less padding, fewer wraps. */
  ${MOI} :is(.row-tile, .bento-tile) > .tile-caption { padding: 10px 12px 11px; }
  ${MOI} :is(.row-tile > h3.tile-caption, :is(.row-tile, .bento-tile) > .tile-caption h3) { font-size: 14px; }
  /* A product page's crumb trail drops the page itself: the title right
     under it names it. */
  ${MOI} .product-top :is(.crumb-current, .crumb-sep:has(+ .crumb-current)) { display: none; }
}
/* Below 360px the two hero labels would wrap: one button a row. */
@media (width < 22.5rem) {
  ${MOI} .home-hero .mt-8 { flex-direction: column; }
  ${MOI} .home-hero .mt-8 > a { flex: none; width: 100%; }
}

/* ---- Sale ribbon and old write-ups. The ribbon is the shop red one step
   deeper, so its 10px word reads (white on it 4.79:1). The old write-ups'
   pure red (#ff0000, 4.0:1 on white) becomes #d30005 (5.57:1), their yellow
   (#ffff00) a deep amber #92400e (7.09:1 on white). ---- */
${MOI} .-rotate-45.bg-\[var\(--menzu-accent\)\] { background-color: #d4363a; }
${moiInlineCss}
`;

// ---- Output -------------------------------------------------------------

const css = `/*
 * TRIAL (13/10/2026): the site in a light dress, white with ocean blue (the
 * owner: "làm thử web với giao diện trắng đi", then "Tone trắng kết hợp xanh
 * biển" and "Làm sao cho web clean hợp nhất đẹp"). Switched by
 * html[data-theme="light"] and nothing else, so the dark site is untouched
 * while the owner decides. The switch is the footer's "Giao diện sáng" link,
 * or ?giao-dien=sang / ?giao-dien=toi on any page; the choice is kept in this
 * browser (localStorage "ttt-theme").
 *
 * A second TRIAL rides on it: ?giao-dien=nike, black and white as close to
 * Nike as can be (the owner, 13/10: "style trắng đen đi làm sao giống nike
 * thử"). It adds data-variant="nike" beside data-theme="light"; its rules are
 * part 5 and match nothing without that attribute.
 *
 * A third TRIAL the same way: ?giao-dien=moi (14/10/2026, "Biến tấu sao cho
 * đẹp hơn đi ở bản sáng", "đẹp hiện đại chuyên nghiệp không có rối"),
 * white and ocean blue with a near-black navbar, data-variant="moi"; its
 * rules are part 6 at the end. ?giao-dien=moi-den is the same dress with a
 * near-black footer (data-footer="den").
 *
 * Generated by scripts/gen-theme-light.mjs; regenerate rather than hand-edit.
 */

/* The order globals.css declares; repeated so this file can never reorder it. */
@layer theme, base, components, utilities;

html[data-theme="light"] {
  color-scheme: light;
  /* A very light cool page, white surfaces, one hairline, navy ink. */
  --light-page: #f4f6f9;
  --light-surface: #ffffff;
  --light-surface-hover: #eef3f8; /* a row or a quiet button under the pointer */
  --light-line: #e2e8f0; /* the one hairline */
  --light-line-strong: #cbd5e1; /* field and quiet-button outlines */
  --light-band: #eaf0f7; /* the top strip and the footer */
  --light-ink: #0f1b2d; /* headings, primary words: 15.96:1 on the page */
  --light-ink-2: #2d3a4e; /* body words: 11.5:1 on white */
  --light-ink-3: #566173; /* muted words: 5.78:1 on the page */
  --light-ink-4: #8a94a3; /* decoration only, never the sole carrier */

  /* The accent. White on ocean and ocean on white both 6.04:1. */
  --ocean: #0b63b6;
  --ocean-dark: #084f93; /* hover, pressed: white on it 8.24:1 */
  --ocean-soft: #eaf2fb; /* a selected pill's ground: ocean on it 5.35:1 */
  --ocean-line: #b9d3ee; /* a selected pill's outline */
  --ocean-ring: rgb(11 99 182 / 0.18); /* drawn as a 3px focus ring */
  /* The shop red, for sale signals only: ribbon, % chips, flash sale. */
  --sale-red: #e13d3f;
  --sale-red-dark: #c92f33;
  --sale-red-ink: #b8262b; /* red words on a red tint, 5.28:1 */
  --float-shadow: 0 2px 6px rgb(15 27 45 / 0.06), 0 18px 44px -18px rgb(15 27 45 / 0.24);

  /* The shop's accent variables. This selector outranks the :root values that
     Cấu hình > Nhận diện writes from the root layout, so the light dress stays
     ocean whatever colour is picked there. */
  --brand: var(--ocean);
  --brand-dark: var(--ocean-dark);
  --menzu-accent: var(--ocean);
  --menzu-accent-dark: var(--ocean-dark);

  --background: var(--light-page);
  --foreground: var(--light-ink);
  --menzu-bg: var(--light-page);
  --menzu-nav: #ffffff;
  --menzu-rail: #ffffff;
  --menzu-backdrop-dim: rgb(244 246 249 / 0.72);
  --menzu-scroll-thumb: #c5cfdc;
  --menzu-scroll-thumb-hover: #a7b4c5;
  --menzu-scroll-thumb-active: var(--ocean);

  /* shadcn's own light values, for the few primitives that read them. */
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);
  --primary: var(--ocean);
  --primary-foreground: #ffffff;
  --secondary: oklch(0.97 0 0);
  --secondary-foreground: oklch(0.205 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: var(--light-ink-3);
  --accent: oklch(0.97 0 0);
  --accent-foreground: oklch(0.205 0 0);
  --border: var(--light-line);
  --input: var(--light-line-strong);
  --ring: var(--ocean);

  /* 1. The palette, turned over. Black stays black: it is only ever an overlay. */
${flipLines}
}

body {
  background-color: var(--background);
}

/* The dark artwork behind every page and the home page's first screen. */
html[data-theme="light"] .site-backdrop {
  display: none;
}

/* 2. Islands: words over pictures, the admin, and every solid colour, with
   the original palette inside. */
html[data-theme="light"] :is(
  .keep-dark,
  ${islands.join(",\n  ")}
) {
${restoreLines}
}

html[data-theme="light"] .keep-dark {
  color-scheme: dark;
  /* The accent one step lighter, so it still reads on black: white on it
     4.50:1, it on #101114 4.19:1 (the dark site's red is 4.25:1). Hover goes
     to the light dress's ocean. */
  --menzu-accent: #1f78d1;
  --brand: #1f78d1;
  --menzu-accent-dark: #0b63b6;
  --brand-dark: #0b63b6;
}

/* A modal's scrim stays a scrim. A picture viewer (keep-dark) keeps its own
   near-black: its close button and counter are drawn for it. */
html[data-theme="light"] [class*="fixed"][class*="inset-0"][class*="bg-black/"]:not(.keep-dark) {
  background-color: rgb(12 12 16 / 0.45);
}

/* Every page stands on the same grey. */
html[data-theme="light"] :is(
  ${pageGrounds.join(",\n  ")}
) {
  background-color: var(--light-page);
}

/* Shadows drawn for black are a soft cool navy on white; a shadow given its
   own colour keeps it (that utility wins over this base rule). */
@layer base {
  html[data-theme="light"] :not(.keep-dark, .keep-dark *) {
    --tw-shadow-color: rgb(15 27 45 / 0.08);
  }
}

/* Write-ups. */
${PROSE} {
  color: var(--light-ink-2);
}
${PROSE} :is(h2, h3, strong) {
  color: var(--light-ink);
}
${PROSE} li::marker {
  color: var(--light-ink-4);
}
${PROSE} a {
  color: var(--ocean);
}
${PROSE} a:hover {
  color: var(--ocean-dark);
}
${PROSE} :is(img, .doc-video) {
  border-color: var(--light-line);
}
/* A quote is a soft blue note with a blue rule; the padding gives the tint
   room round the words. */
${PROSE} blockquote {
  border-left-color: var(--ocean-line);
  background-color: var(--ocean-soft);
  padding: 0.55rem 0.9rem;
  border-radius: 0 0.5rem 0.5rem 0;
  color: var(--light-ink-3);
}
${PROSE} figcaption {
  color: var(--light-ink-3);
}
${PROSE} :not(pre) > code {
  background: rgb(15 16 21 / 0.05);
  border-color: var(--light-line);
  color: var(--light-ink);
}

${inlineCss}

/* 3. Colours typed as hex (${hexCount} class tokens), and the wells of black. */
@layer utilities {
${hexCss}

${wellCss}
}

${oceanCss}
${nikeCss}
${moiCss}`;

fs.writeFileSync(OUT, css);
console.log(`${OUT}: ${flips.size} palette flips, ${islands.length} islands, ${hexCount} hex tokens`);
if (skipped.length) console.log(`skipped (unknown variant): ${skipped.join(", ")}`);
