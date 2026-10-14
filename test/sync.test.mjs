import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const script = fileURLToPath(new URL('../scripts/sync.mjs', import.meta.url));
const run = (file, args) => spawnSync(process.execPath, [file, ...args], { encoding: 'utf8' });

test('filtered sync rewrites font URLs, records metadata and verifies without a checkout', () => {
  const dest = mkdtempSync(join(tmpdir(), 'dakit-sync-'));
  try {
    const result = run(script, ['--dest', dest, '--files', 'dakit.css', 'tokens.js', '--fonts-dir', 'assets/fonts']);
    assert.equal(result.status, 0, result.stderr);
    const lock = JSON.parse(readFileSync(join(dest, 'dakit.lock.json')));
    assert.match(lock.version, /^\d+\.\d+\.\d+$/);
    assert.match(lock.commit, /^[a-f0-9]+$/);
    assert.ok(lock.files['assets/fonts/inter-var.woff2']);
    assert.ok(lock.files['sync.mjs']);
    assert.ok(lock.files['check-borders.mjs']);
    assert.ok(!lock.files['tokens.css']);
    assert.match(readFileSync(join(dest, 'dakit.css'), 'utf8'), /url\("\.\/assets\/fonts\/inter-var.woff2"\)/);
    const vendored = join(dest, 'sync.mjs');
    assert.equal(run(vendored, ['--check', '--dest', dest]).status, 0);
    writeFileSync(join(dest, 'tokens.js'), 'hand edited');
    const changed = run(vendored, ['--check', '--dest', dest]);
    assert.equal(changed.status, 1);
    assert.match(changed.stderr, /tokens.js: changed/);
    unlinkSync(join(dest, 'assets/fonts/inter-var.woff2'));
    assert.match(run(vendored, ['--check', '--dest', dest]).stderr, /inter-var.woff2: missing/);
    lock.files['../outside'] = '0'.repeat(64);
    writeFileSync(join(dest, 'dakit.lock.json'), JSON.stringify(lock));
    assert.match(run(vendored, ['--check', '--dest', dest]).stderr, /escapes destination/);
  } finally { rmSync(dest, { recursive: true, force: true }); }
});

test('default sync includes all dist files and refuses traversal', () => {
  const dest = mkdtempSync(join(tmpdir(), 'dakit-sync-'));
  try {
    assert.equal(run(script, ['--dest', dest]).status, 0);
    const lock = JSON.parse(readFileSync(join(dest, 'dakit.lock.json')));
    for (const file of ['dakit.css', 'tokens.css', 'tokens.js', 'tokens.global.js', 'tokens.d.ts', 'dialogs.js']) assert.ok(lock.files[file]);
    assert.equal(run(join(dest, 'sync.mjs'), ['--check', '--dest', dest]).status, 0);
    assert.equal(run(script, ['--dest', dest, '--files', '../package.json']).status, 1);
  } finally { rmSync(dest, { recursive: true, force: true }); }
});

test('default sync vendors every dist file, including shell.js and device-code.js', () => {
  const dest = mkdtempSync(join(tmpdir(), 'dakit-sync-'));
  try {
    const result = run(script, ['--dest', dest]);
    assert.equal(result.status, 0, result.stderr);
    const lock = JSON.parse(readFileSync(join(dest, 'dakit.lock.json')));
    for (const name of ['dakit.css', 'tokens.css', 'dialogs.js', 'shell.js', 'device-code.js']) assert.ok(lock.files[name], name);
  } finally {
    rmSync(dest, { recursive: true, force: true });
  }
});
