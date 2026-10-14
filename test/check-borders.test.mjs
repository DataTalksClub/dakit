import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { checkBorders } from "../scripts/check-borders.mjs";

const root = dirname(fileURLToPath(import.meta.url));

// Test 1: good.css passes with 0 violations
const goodFile = join(root, "fixtures/good.css");
const goodViolations = checkBorders([goodFile]);
assert.equal(goodViolations.length, 0, `good.css should have 0 violations, got: ${JSON.stringify(goodViolations)}`);

// Test 2: bad.css catches:
// 1. colored outlined alert box
// 2. border-left: 3px solid var(--x-accent)
// 3. inset box-shadow stripe
// 4-8. coloured outline shorthand, rgba() inset ring, :focus ring, a selector
//      list borrowing :focus-visible, a raw coloured var() fallback
const badFile = join(root, "fixtures/bad.css");
const badViolations = checkBorders([badFile]);
assert.equal(badViolations.length, 8, `bad.css should have 8 violations, got ${badViolations.length}`);

const reasons = badViolations.map((v) => v.reason);
assert(reasons.some((r) => r.includes("#f85149") && r.includes("accent border")), "Should catch colored outlined alert box");
assert(reasons.some((r) => r.includes("border-left") && r.includes("wider than 1px")), "Should catch border-left wider than 1px");
assert(reasons.some((r) => r.includes("inset box-shadow") && r.includes("inset 3px 0 0")), "Should catch inset box-shadow stripe");
assert(reasons.some((r) => r.includes("outline") && r.includes("#3b82f6")), "Should catch outline: 2px dashed #3b82f6");
assert(reasons.some((r) => r.includes("ring") && r.includes("rgba(59, 130, 246")), "Should catch a coloured rgba() inset ring");
assert.equal(reasons.filter((r) => r.includes("outside :focus-visible")).length, 3, "Should catch :focus and selector-list outlines");
assert(reasons.some((r) => r.includes("fallback")), "Should catch a raw coloured var() fallback");

console.log("ok: all check-borders tests passed.");
