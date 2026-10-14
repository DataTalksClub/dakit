import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { extractDeclarations } from "../scripts/check-borders.mjs";

// The select chevron is a background-image from the base layer. A later
// `background:` shorthand on a rule that reaches selects resets it, which is
// how every .dk-select lost its chevron.
test("no kit rule that styles selects uses the background shorthand", () => {
  const offenders = [];
  for (const file of ["css/components.css", "css/shell.css"]) {
    const path = fileURLToPath(new URL(`../${file}`, import.meta.url));
    for (const decl of extractDeclarations(path)) {
      if (decl.property === "background" && /(^|[\s,(>+~])select\b|\.dk-select\b/.test(decl.rule)) {
        offenders.push(`${file}:${decl.line} ${decl.rule}`);
      }
    }
  }
  assert.deepEqual(offenders, []);
});
