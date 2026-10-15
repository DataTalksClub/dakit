#!/usr/bin/env node
// Dakit build: tokens/*.json -> dist/tokens.css, dist/dakit.css, dist/tokens.js
//
// The build is the gatekeeper, not a formality:
//   - every "{ramp.step}" alias must resolve (no dangling references)
//   - every dark override must exist in the light theme (dark is a remap, not a new vocabulary)
//   - every pair in tokens/contrast.json must meet its WCAG ratio in BOTH themes
// A failing check exits nonzero and prints which token failed, in which theme.

import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { checkBorders } from "./scripts/check-borders.mjs";
import { checkColors } from "./scripts/check-colors.mjs";

const root = dirname(fileURLToPath(import.meta.url));
const read = (p) => JSON.parse(readFileSync(join(root, p), "utf8"));

const { version } = read("package.json");
// Ignore commits containing only docs or generated output, so rebuilding is stable.
const commit = execFileSync("git", [
  "log", "-1", "--format=%h", "--", "tokens", "css", "js", "fonts", "build.mjs", "package.json",
], {
  cwd: root, encoding: "utf8",
}).trim();
const stamp = `/* dakit ${version} ${commit} */\n`;
const emit = (file, contents) => writeFileSync(join(root, "dist", file), stamp + contents);

const primitives = read("tokens/primitives.json");
const semantic = read("tokens/semantic.json");
const dark = read("tokens/themes/dark.json");
const contrastSpec = read("tokens/contrast.json");
const baseCss = readFileSync(join(root, "css/base.css"), "utf8");
const componentsCss = readFileSync(join(root, "css/components.css"), "utf8");
const shellCss = readFileSync(join(root, "css/shell.css"), "utf8");
const dialogsJs = readFileSync(join(root, "js/dialogs.js"), "utf8");
const shellJs = readFileSync(join(root, "js/shell.js"), "utf8");
const splitJs = readFileSync(join(root, "js/split.js"), "utf8");
const tabsJs = readFileSync(join(root, "js/tabs.js"), "utf8");
const collectionJs = readFileSync(join(root, "js/collection.js"), "utf8");
const deviceCodeJs = readFileSync(join(root, "js/device-code.js"), "utf8");

// --- flatten ----------------------------------------------------------------

function flatten(obj, out = {}, path = []) {
  for (const [key, value] of Object.entries(obj)) {
    if (key.startsWith("$")) continue;
    const p = [...path, key];
    if (value !== null && typeof value === "object") {
      if ("$value" in value) {
        out["--dk-" + p.join("-")] = String(value.$value);
      } else {
        flatten(value, out, p);
      }
    } else {
      out["--dk-" + p.join("-")] = String(value);
    }
  }
  return out;
}

const prim = flatten(primitives); // --dk-gray-200, --dk-space-3, ...
const light = flatten(semantic.light); // --dk-bg-page, ...
const darkOverrides = flatten(dark); // subset of the light names

// --- resolve {ramp.step} aliases --------------------------------------------

// Aliases may point at primitives or at other semantic tokens (light values,
// so themes stay predictable). Resolution is two-pass and cycle-checked.
// A compound value ("{space.2} {space.3}", a padding shorthand) resolves
// each reference against the primitives in place.
function resolveCompound(name, value) {
  return value.replace(/\{([^{}]+)\}/g, (_, path) => {
    const target = prim["--dk-" + path.replaceAll(".", "-")];
    if (target === undefined) throw new Error(`unresolved alias {${path}} (used by ${name})`);
    return target;
  });
}

function resolve(map) {
  // Each chain carries its own seen-set: a role that aliases another role
  // resolves the same whether or not that role was already visited.
  const lookup = (name, value, chain) => {
    if (/\{[^{}]+\}/.test(value) && !/^\{[^{}]+\}$/.test(value)) return resolveCompound(name, value);
    if (!/^\{.+\}$/.test(value)) return value;
    if (chain.has(name)) throw new Error(`alias cycle at ${name}`);
    const ref = "--dk-" + value.slice(1, -1).replaceAll(".", "-");
    const target = prim[ref] ?? map[ref];
    if (target === undefined) throw new Error(`unresolved alias ${value} (used by ${name})`);
    return lookup(ref, target, new Set(chain).add(name));
  };
  return Object.fromEntries(Object.entries(map).map(([name, value]) => [name, lookup(name, value, new Set())]));
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

// --- border rules check ------------------------------------------------------

const borderViolations = checkBorders([
  join(root, "css"),
  ...readdirSync(root).filter((f) => /^showcase.*\.html$/.test(f)).map((f) => join(root, f)),
]);
for (const v of borderViolations) {
  fail(`border rule violation at ${v.file}:${v.line}: ${v.reason}`);
}
for (const v of checkColors([join(root, "css")])) {
  fail(`colour rule violation at ${v.file}:${v.line}: ${v.reason}`);
}

if (failed) {
  console.error("\nbuild failed: fix the tokens above; do not lower the minimums to pass.");
  process.exit(1);
}

// --- emit ---------------------------------------------------------------------

mkdirSync(join(root, "dist"), { recursive: true });

// Primitive color ramps (gray, blue, green, amber, red) are resolved to semantic roles
// at build time and not emitted into CSS. Scales (font, text, leading, weight, space, radius, size) are kept.
const isColorRamp = (k) => /^--dk-(gray|blue|green|amber|red)-/.test(k);
const scales = Object.fromEntries(
  Object.entries(prim).filter(([k]) => !isColorRamp(k)),
);

function cssBlock(selector, map, extraProps = {}) {
  const entries = [...Object.entries(extraProps), ...Object.entries(map)];
  const lines = entries.map(([k, v]) => `  ${k}: ${v};`);
  return `${selector} {\n${lines.join("\n")}\n}`;
}

const tokensCss = `/* Generated by build.mjs from tokens/*.json — do not edit; edit the tokens and rebuild. */
${cssBlock(":root", { ...scales, ...lightResolved }, { "color-scheme": "light" })}
${cssBlock(':root[data-theme="dark"]', darkResolved, { "color-scheme": "dark" })}
`;

emit("tokens.css", tokensCss);
emit("dakit.css", `@layer dk.base, dk.components;\n\n${tokensCss}\n@layer dk.base {\n/* --- base ---------------------------------------------------------------- */\n${baseCss}\n}\n@layer dk.components {\n/* --- components ----------------------------------------------------------- */\n${componentsCss}\n/* --- shell ----------------------------------------------------------------- */\n${shellCss}\n}\n`);

const tokensJs = `// Generated by build.mjs — do not edit.
export const version = ${JSON.stringify(version)};
export const commit = ${JSON.stringify(commit)};
export const light = ${JSON.stringify(lightResolved, null, 2)};
export const dark = ${JSON.stringify({ ...lightResolved, ...darkResolved }, null, 2)};
export const primitives = ${JSON.stringify(prim, null, 2)};
`;
emit("tokens.js", tokensJs);
// Plain-global build: the showcase imports it so it also works over file://,
// where ES-module imports are blocked by CORS.
emit(
  "tokens.global.js",
  `// Generated by build.mjs — do not edit.\nglobalThis.dakitTokens = { version: ${JSON.stringify(version)}, commit: ${JSON.stringify(commit)}, light: ${JSON.stringify(lightResolved)}, dark: ${JSON.stringify({ ...lightResolved, ...darkResolved })}, primitives: ${JSON.stringify(prim)} };\n`,
);
emit(
  "tokens.d.ts",
  `export declare const version: string;\nexport declare const commit: string;\nexport declare const light: Record<string, string>;\nexport declare const dark: Record<string, string>;\nexport declare const primitives: Record<string, string>;\n`,
);
// Hand-written JS is shipped verbatim; the build copies it so dist/ stays
// the single consumable.
emit("dialogs.js", dialogsJs);
emit("shell.js", shellJs);
emit("split.js", splitJs);
emit("tabs.js", tabsJs);
emit("collection.js", collectionJs);
emit("device-code.js", deviceCodeJs);

console.log(
  `\nbuilt dist/tokens.css, dist/dakit.css, dist/tokens.js, dist/{dialogs,shell,split,tabs,collection,device-code}.js — ${Object.keys(prim).length} primitives, ${Object.keys(lightResolved).length} semantic roles, ${Object.keys(darkResolved).length} dark overrides`,
);
