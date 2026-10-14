import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { checkColors } from "../scripts/check-colors.mjs";

const root = dirname(fileURLToPath(import.meta.url));

const good = checkColors([join(root, "fixtures/colors-good.css")]);
assert.equal(good.length, 0, `colors-good.css should pass, got: ${JSON.stringify(good)}`);

const bad = checkColors([join(root, "fixtures/colors-bad.css")]);
const literals = bad.map((v) => v.reason.match(/raw colour (.+) in /)[1]);
assert.deepEqual(literals, [
  "#f85149",
  "rgba(248, 81, 73, 0.12)",
  "#2563eb",
  "hsl(210 80% 50%)",
  "rgb(0 0 0 / 4%)",
  "oklch(70% 0.1 250)",
]);
assert.deepEqual(bad.map((v) => v.line), [1, 2, 3, 4, 5, 5]);

console.log("ok: all check-colors tests passed.");
