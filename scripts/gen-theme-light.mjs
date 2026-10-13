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

const surfaceCss = [
  panels &&
    `  ${LIGHT} ${panels}:where([class*="border"])${NOT_ISLAND} {\n    background-color: var(--light-surface);\n  }`,
  quietFills &&
    `  ${LIGHT} ${quietFills}:where(button, a, label, [role="button"], [role="tab"])${NOT_ISLAND} {\n    background-color: var(--light-surface);\n    box-shadow: inset 0 0 0 1px var(--light-line-strong);\n  }`,
  quietHovers && `  ${LIGHT} ${quietHovers}${NOT_ISLAND} {\n    background-color: var(--light-surface-hover);\n  }`,
  hairlines && `  ${LIGHT} ${hairlines}${NOT_ISLAND} {\n    border-color: var(--light-line);\n  }`,
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

${oceanCss}`;

fs.writeFileSync(OUT, css);
console.log(`${OUT}: ${flips.size} palette flips, ${islands.length} islands, ${hexCount} hex tokens`);
if (skipped.length) console.log(`skipped (unknown variant): ${skipped.join(", ")}`);
