#!/usr/bin/env node
// Dakit build: tokens/*.json -> dist/tokens.css, dist/dakit.css, dist/tokens.js
//
// The build is the gatekeeper, not a formality:
//   - every "{ramp.step}" alias must resolve (no dangling references)
//   - every dark override must exist in the light theme (dark is a remap, not a new vocabulary)
//   - every pair in tokens/contrast.json must meet its WCAG ratio in BOTH themes
// A failing check exits nonzero and prints which token failed, in which theme.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const read = (p) => JSON.parse(readFileSync(join(root, p), "utf8"));

const primitives = read("tokens/primitives.json");
const semantic = read("tokens/semantic.json");
const dark = read("tokens/themes/dark.json");
const contrastSpec = read("tokens/contrast.json");
const baseCss = readFileSync(join(root, "css/base.css"), "utf8");
const componentsCss = readFileSync(join(root, "css/components.css"), "utf8");

// --- flatten ----------------------------------------------------------------

function flatten(obj, out = {}, path = []) {
  for (const [key, value] of Object.entries(obj)) {
    if (key === "$comment") continue;
    const p = [...path, key];
    if (value !== null && typeof value === "object") flatten(value, out, p);
    else out["--dk-" + p.join("-")] = String(value);
  }
  return out;
}

const prim = flatten(primitives); // --dk-gray-200, --dk-space-3, ...
const light = flatten(semantic.light); // --dk-bg-page, ...
const darkOverrides = flatten(dark); // subset of the light names

// --- resolve {ramp.step} aliases --------------------------------------------

// Aliases may point at primitives or at other semantic tokens (light values,
// so themes stay predictable). Resolution is two-pass and cycle-checked.
function resolve(map, seen = new Set()) {
  const out = {};
  for (const [name, value] of Object.entries(map)) {
    if (!/^\{.+\}$/.test(value)) {
      out[name] = value;
      continue;
    }
    if (seen.has(name)) throw new Error(`alias cycle at ${name}`);
    seen.add(name);
    const ref = "--dk-" + value.slice(1, -1).replaceAll(".", "-");
    const target = prim[ref] ?? map[ref];
    if (target === undefined) throw new Error(`unresolved alias ${value} (used by ${name})`);
    out[name] = /^\{.+\}$/.test(target) && !seen.has(ref) ? resolve({ [ref]: target }, seen)[ref] : target;
  }
  return out;
}

const lightResolved = resolve(light);
const darkResolved = Object.fromEntries(
  Object.entries(resolve(darkOverrides)).map(([k, v]) => [k, v]),
);

// --- validation --------------------------------------------------------------

let failed = false;
const fail = (msg) => {
  failed = true;
  console.error("FAIL " + msg);
};

for (const name of Object.keys(darkOverrides)) {
  if (!(name in light)) fail(`dark override ${name} has no light counterpart`);
}

// --- WCAG contrast -----------------------------------------------------------

function parseColor(str) {
  str = str.trim();
  if (str.startsWith("#")) {
    const hex = str.slice(1);
    const full = hex.length === 3 ? hex.split("").map((c) => c + c).join("") : hex;
    const n = parseInt(full, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a: 1 };
  }
  const m = str.match(/^rgba?\(([^)]+)\)$/);
  if (m) {
    const [r, g, b, a = 1] = m[1].split(",").map((s) => parseFloat(s));
    return { r, g, b, a };
  }
  return null;
}

function over(color, backdrop) {
  if (color.a >= 1) return color;
  return {
    r: color.r * color.a + backdrop.r * (1 - color.a),
    g: color.g * color.a + backdrop.g * (1 - color.a),
    b: color.b * color.a + backdrop.b * (1 - color.a),
    a: 1,
  };
}

function luminance({ r, g, b }) {
  const lin = (c) => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrast(fg, bg) {
  const l1 = luminance(fg);
  const l2 = luminance(bg);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

const name = (role) => "--dk-" + role.replaceAll(".", "-");

console.log("WCAG contrast (alpha backgrounds composited over bg.page):");
// Contrast runs per theme: light theme = lightResolved; dark = lightResolved
// with every dark override applied (dark only remaps existing roles).
const themes = {
  light: lightResolved,
  dark: { ...lightResolved, ...darkResolved },
};

for (const [themeName, map] of Object.entries(themes)) {
  const pageBg = parseColor(map[name("bg.page")]);
  for (const { fg, bg, min } of contrastSpec.pairs) {
    const fgColor = map[name(fg)];
    const bgColor = map[name(bg)];
    if (!fgColor || !bgColor) {
      fail(`contrast pair ${fg}/${bg} (${themeName}): unknown token`);
      continue;
    }
    // Backgrounds with alpha sit on the page; composite before measuring.
    const bgParsed = over(parseColor(bgColor), pageBg);
    const ratio = contrast(parseColor(fgColor), bgParsed);
    const ok = ratio >= min;
    console.log(
      `  ${ok ? "ok  " : "FAIL"} ${themeName.padEnd(5)} ${fg.padEnd(18)} on ${bg.padEnd(16)} ${ratio.toFixed(2)}:1 (min ${min})`,
    );
    if (!ok) failed = true;
  }
}

if (failed) {
  console.error("\nbuild failed: fix the tokens above; do not lower the minimums to pass.");
  process.exit(1);
}

// --- emit ---------------------------------------------------------------------

mkdirSync(join(root, "dist"), { recursive: true });

function cssBlock(selector, map) {
  const lines = Object.entries(map).map(([k, v]) => `  ${k}: ${v};`);
  return `${selector} {\n${lines.join("\n")}\n}`;
}

const tokensCss = `/* Generated by build.mjs from tokens/*.json — do not edit; edit the tokens and rebuild. */
${cssBlock(":root", { ...prim, ...lightResolved })}
${cssBlock(':root[data-theme="dark"]', darkResolved)}
`;

writeFileSync(join(root, "dist/tokens.css"), tokensCss);
writeFileSync(join(root, "dist/dakit.css"), `${tokensCss}\n/* --- base ---------------------------------------------------------------- */\n${baseCss}\n/* --- components ----------------------------------------------------------- */\n${componentsCss}`);

const tokensJs = `// Generated by build.mjs — do not edit.
export const light = ${JSON.stringify(lightResolved, null, 2)};
export const dark = ${JSON.stringify({ ...lightResolved, ...darkResolved }, null, 2)};
export const primitives = ${JSON.stringify(prim, null, 2)};
`;
writeFileSync(join(root, "dist/tokens.js"), tokensJs);
// Plain-global build: the showcase imports it so it also works over file://,
// where ES-module imports are blocked by CORS.
writeFileSync(
  join(root, "dist/tokens.global.js"),
  `// Generated by build.mjs — do not edit.\nglobalThis.dakitTokens = { light: ${JSON.stringify(lightResolved)}, dark: ${JSON.stringify({ ...lightResolved, ...darkResolved })}, primitives: ${JSON.stringify(prim)} };\n`,
);
writeFileSync(
  join(root, "dist/tokens.d.ts"),
  `export declare const light: Record<string, string>;\nexport declare const dark: Record<string, string>;\nexport declare const primitives: Record<string, string>;\n`,
);

console.log(
  `\nbuilt dist/tokens.css, dist/dakit.css, dist/tokens.js — ${Object.keys(prim).length} primitives, ${Object.keys(lightResolved).length} semantic roles, ${Object.keys(darkResolved).length} dark overrides`,
);
