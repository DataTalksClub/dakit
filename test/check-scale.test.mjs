import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync, cpSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { checkScale, scaleViolations, writeBaseline } from "../scripts/check-scale.mjs";

const root = dirname(fileURLToPath(import.meta.url));
const good = join(root, "fixtures/scale-good.css");
const bad = join(root, "fixtures/scale-bad.css");

assert.deepEqual(scaleViolations([good]), [], "scale-good.css should pass");

const kind = (reason) => reason.match(/raw px font-size|negative margin|off the 4px grid/)[0];
const found = scaleViolations([bad]).map((v) => [v.line, kind(v.reason)]);
assert.deepEqual(found, [
  [1, "off the 4px grid"],
  [2, "raw px font-size"],
  [3, "negative margin"],
  [3, "off the 4px grid"],
  [4, "off the 4px grid"],
  [5, "negative margin"],
  [6, "off the 4px grid"],
  [7, "off the 4px grid"],
]);

// Baseline ratchet, in a scratch directory.
const dir = mkdtempSync(join(tmpdir(), "check-scale-"));
const css = join(dir, "app.css");
const baseline = join(dir, "baseline.json");
cpSync(bad, css);

assert.ok(checkScale([css]).failures.length > 0, "no baseline: every violation fails");

writeBaseline([css], baseline);
assert.deepEqual(checkScale([css], { baseline }).failures, [], "baselined debt passes");

// A new violation, or a second copy of a baselined one, fails.
writeFileSync(css, `${readFileSync(bad, "utf8")}.h { padding: 3px; }\n.i { gap: 6px; }\n`);
const grown = checkScale([css], { baseline }).failures;
assert.equal(grown.length, 2);
assert.match(grown[0], /padding: 3px/);
assert.throws(() => writeBaseline([css], baseline), /refusing to grow the baseline/);

// Migrating a rule without trimming the baseline fails, so the list shrinks.
writeFileSync(css, readFileSync(bad, "utf8").replace(".d { gap: 6px; }\n", ".d { gap: 8px; }\n"));
const stale = checkScale([css], { baseline }).failures;
assert.equal(stale.length, 1);
assert.match(stale[0], /lists "gap: 6px" x1 but only 0 remain/);
writeBaseline([css], baseline);
assert.deepEqual(checkScale([css], { baseline }).failures, []);
assert.ok(!readFileSync(baseline, "utf8").includes("gap: 6px"));

console.log("ok: all check-scale tests passed.");
