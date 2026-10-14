import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeUserCode, formatUserCode, describeUserCodeError, USER_CODE_ALPHABET } from "../js/device-code.js";

test("case folding and separators", () => {
  for (const raw of ["bcdf-ghjk", "BCDFGHJK", " bcdf ghjk ", "BCDF–GHJK", "bc.df_gh-jk", "BCDF‑GHJK"]) {
    assert.deepEqual(normalizeUserCode(raw), { ok: true, code: "BCDFGHJK", display: "BCDF-GHJK" }, raw);
  }
});

test("never truncates: overlong is an error that keeps every character", () => {
  const r = normalizeUserCode("BCDF-GHJK-M");
  assert.equal(r.ok, false);
  assert.equal(r.error, "too_long");
  assert.equal(r.length, 9);
  assert.equal(r.display, "BCDF-GHJK-M");
  assert.equal(formatUserCode("bcdfghjkmnpq"), "BCDF-GHJK-MNPQ");
});

test("too short and empty", () => {
  assert.equal(normalizeUserCode("BCDF-GH").error, "too_short");
  assert.equal(normalizeUserCode("  -- ").error, "empty");
  assert.equal(normalizeUserCode(undefined).error, "empty");
});

test("invalid characters are named, not dropped", () => {
  const r = normalizeUserCode("ABCD-FGHJ");
  assert.equal(r.error, "invalid_char");
  assert.equal(r.char, "A");
  assert.match(describeUserCodeError(r), /letter “A”/);
  assert.equal(normalizeUserCode("BCDF-GHJ0").char, "0");
  assert.match(describeUserCodeError(normalizeUserCode("BCDF-GHJ0")), /digit “0”/);
});

test("canonical alphabet excludes L and V; legacy alphabet accepts them", () => {
  assert.ok(!USER_CODE_ALPHABET.includes("L") && !USER_CODE_ALPHABET.includes("V"));
  assert.equal(normalizeUserCode("LVBC-DFGH").error, "invalid_char");
  assert.equal(normalizeUserCode("LVBC-DFGH", { alphabet: "BCDFGHJKLMNPQRSTVWXZ23456789" }).ok, true);
});

test("error sentences", () => {
  assert.equal(describeUserCodeError(normalizeUserCode("BCDFGH")), "Codes have 8 characters. This one has 6.");
  assert.match(describeUserCodeError(normalizeUserCode("BCDFGHJKM")), /has 9\. Check for an extra character\./);
  assert.equal(describeUserCodeError(normalizeUserCode("BCDFGHJK")), "");
});
