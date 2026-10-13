// Generates src/app/theme-light.css: the site in a light dress (TRIAL,
// 13/10/2026, the owner: "làm thử web với giao diện trắng đi").
// Run from the repo root:  node scripts/gen-theme-light.mjs
//
// Every rule sits under html[data-theme="light"], so the dark site is left
// exactly as it is. Three parts:
//  1. The palette turned over. Tailwind paints from CSS variables, so white
//     becomes ink, the grey scales run the other way and the bright status
//     shades become their deep ones.
//  2. Islands that keep the original palette inside: .keep-dark (words over
//     pictures, the admin) and every element whose own background is a solid
//     colour (accent buttons, coloured badges, a white button with dark text).
//  3. The colours typed as hex, which no variable reaches: one rule per class
//     token found in the source, its variants included, at the specificity of
//     Tailwind's own rule and inside its utilities layer, so a hover written
//     next to it still wins as it does on the dark site.
//
// Classes are matched as whole tokens. A substring match once caught
// "selection:bg-[var(--menzu-accent)]/30" on every page wrapper and put the
// white text back on the whole page.
import fs from "node:fs";
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
const THEME = fs.readFileSync("node_modules/tailwindcss/theme.css", "utf8");
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

const flips = new Map([["white", "var(--light-ink)"]]);
for (const family of GREYS) {
  if (!SHADES.some((s) => used.has(`${family}-${s}`))) continue;
  for (const s of SHADES) if (s !== "500") flips.set(`${family}-${s}`, tw(`${family}-${MIRROR[s]}`));
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
  if (info.reddish && info.lum < 0.12) return interactive ? "#ffe4e6" : "#fff1f2";
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

// ---- Output -------------------------------------------------------------

const css = `/*
 * TRIAL (13/10/2026, the owner: "làm thử web với giao diện trắng đi"): the site
 * in a light dress, switched by html[data-theme="light"] and nothing else, so
 * the dark site is untouched while the owner decides. The switch is the footer's
 * "Giao diện sáng" link, or ?giao-dien=sang / ?giao-dien=toi on any page; the
 * choice is kept in this browser (localStorage "ttt-theme").
 *
 * Generated by scripts/gen-theme-light.mjs; regenerate rather than hand-edit.
 */

/* The order globals.css declares; repeated so this file can never reorder it. */
@layer theme, base, components, utilities;

html[data-theme="light"] {
  color-scheme: light;
  --light-page: #f3f4f6;
  --light-surface: #ffffff;
  --light-surface-hover: #f1f2f5;
  --light-line: #e4e5ea;
  --light-ink: oklch(0.21 0.006 270);
  --light-ink-2: #34353d;
  --light-ink-3: #5d5e69;
  --light-ink-4: #a1a3ad;

  --background: var(--light-page);
  --foreground: var(--light-ink);
  --menzu-bg: var(--light-page);
  --menzu-nav: #ffffff;
  --menzu-rail: #ffffff;
  --menzu-backdrop-dim: rgb(243 244 246 / 0.7);

  /* shadcn's own light values, for the few primitives that read them. */
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.97 0 0);
  --secondary-foreground: oklch(0.205 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --accent: oklch(0.97 0 0);
  --accent-foreground: oklch(0.205 0 0);
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.708 0 0);

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
}

/* A modal's scrim stays a scrim. */
html[data-theme="light"] [class*="fixed"][class*="inset-0"][class*="bg-black/"] {
  background-color: rgb(12 12 16 / 0.45);
}

/* Every page stands on the same grey. */
html[data-theme="light"] :is(
  ${pageGrounds.join(",\n  ")}
) {
  background-color: var(--light-page);
}

/* Shadows drawn for black are soft grey on white; a shadow given its own
   colour keeps it (that utility wins over this base rule). */
@layer base {
  html[data-theme="light"] :not(.keep-dark, .keep-dark *) {
    --tw-shadow-color: rgb(15 16 21 / 0.1);
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
  color: ${tw("rose-600")};
}
${PROSE} a:hover {
  color: var(--light-ink);
}
${PROSE} :is(img, .doc-video) {
  border-color: var(--light-line);
}
${PROSE} blockquote {
  border-left-color: var(--light-line);
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
`;

fs.writeFileSync(OUT, css);
console.log(`${OUT}: ${flips.size} palette flips, ${islands.length} islands, ${hexCount} hex tokens`);
if (skipped.length) console.log(`skipped (unknown variant): ${skipped.join(", ")}`);
