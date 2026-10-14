// Browser behaviour of load-before-open (dist/dialogs.js openWhenReady + the .dk-spinner /
// [aria-busy] / .dk-loading / .dk-toast CSS) on showcase.html#loading, headless.
// Playwright isn't a dakit dependency: it's found the same way scripts/shots.mjs
// finds it (PLAYWRIGHT_MODULE, then `playwright`, then ~/git/dataops). Without
// it, these tests skip instead of failing.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.woff2': 'font/woff2' };

async function loadPlaywright() {
  const require = createRequire(import.meta.url);
  const candidates = process.env.PLAYWRIGHT_MODULE
    ? [process.env.PLAYWRIGHT_MODULE]
    : ['playwright', join(homedir(), 'git/dataops/node_modules/playwright/index.mjs')];
  for (const candidate of candidates) {
    try { return await import(pathToFileURL(require.resolve(candidate)).href); } catch { /* next */ }
  }
  return null;
}

let browser = null;
let server = null;
let base = '';
let skip = false;
const errors = [];

before(async () => {
  const pw = await loadPlaywright();
  if (!pw) { skip = 'Playwright not found (set PLAYWRIGHT_MODULE)'; return; }
  try { browser = await pw.chromium.launch({ headless: true }); } catch (error) { skip = `Chromium unavailable: ${error.message.split('\n')[0]}`; return; }
  server = createServer(async (req, res) => {
    try {
      const path = resolve(root, `.${decodeURIComponent(new URL(req.url, 'http://x').pathname)}`);
      if (!path.startsWith(root + sep)) throw new Error('outside');
      res.writeHead(200, { 'Content-Type': types[extname(path)] || 'application/octet-stream' });
      res.end(await readFile(path));
    } catch { res.writeHead(404).end(); }
  });
  await new Promise((done) => server.listen(0, '127.0.0.1', done));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (browser) await browser.close();
  if (server) await new Promise((done) => server.close(done));
});

async function open(t, path, viewport = { width: 1440, height: 900 }, extra = {}) {
  if (skip) { t.skip(skip); return null; }
  const page = await browser.newPage({ viewport, reducedMotion: 'reduce', ...extra });
  page.on('pageerror', (e) => errors.push(`${path}: ${e.message}`));
  await page.goto(base + path);
  return page;
}
// Layout can trail a state change by a frame when the machine is busy (the
// test runner runs files in parallel), so geometry is polled, not read once.
async function settles(page, predicate, message, arg) {
  const ok = await page.waitForFunction(predicate, arg, { timeout: 3000 }).then(() => true, () => false);
  assert.ok(ok, message);
}

const desktop = { width: 1280, height: 800 };

const URL_ = '/showcase.html?theme=light';
const slow = '#loading [data-demo-load="1500"]';
const fast = '#loading [data-demo-load="80"]';
const fails = '#loading [data-demo-fail]';

// A controllable load: window.__load resolves/rejects it from the test.
async function arm(page) {
  await page.evaluate(() => {
    window.__calls = 0;
    window.__signals = [];
    window.__start = (selector, opts = {}) => {
      const trigger = document.querySelector(selector);
      const dialog = document.getElementById('run-dialog');
      window.__result = dakitDialogs.openWhenReady(trigger, (signal) => {
        window.__calls += 1;
        window.__signals.push(signal);
        return new Promise((ok, no) => { window.__ok = ok; window.__no = no; });
      }, (data) => {
        // At render time the dialog is still closed: content first, then open.
        window.__openAtRender = dialog.open;
        dialog.querySelector('#run-dialog-title').textContent = data.name;
        return dialog;
      }, opts);
    };
  });
}
const state = (page, selector) => page.evaluate((sel) => {
  const t = document.querySelector(sel);
  const r = t.getBoundingClientRect();
  return {
    busy: t.getAttribute('aria-busy'), disabled: t.getAttribute('aria-disabled'), w: r.width, h: r.height,
    dialogOpen: document.getElementById('run-dialog').open,
    overlayOpen: !!document.querySelector('dialog.dk-loading[open]'),
    toast: document.querySelector('.dk-toast')?.textContent || null,
    focus: document.activeElement === t,
  };
}, selector);

test('fast load: no overlay, the dialog opens once with its content, trigger restored', async (t) => {
  const page = await open(t, URL_);
  if (!page) return;
  await arm(page);
  const before = await state(page, slow);
  await page.evaluate(() => window.__start('#loading [data-demo-load="1500"]'));
  const busy = await state(page, slow);
  assert.equal(busy.busy, 'true');
  assert.equal(busy.disabled, 'true');
  assert.equal(busy.dialogOpen, false, 'nothing opens before the data is in');
  assert.deepEqual([busy.w, busy.h], [before.w, before.h], 'busy trigger keeps its size');
  await page.waitForTimeout(250);
  assert.deepEqual(await page.evaluate((s) => { const r = document.querySelector(s).getBoundingClientRect(); return [r.width, r.height]; }, slow), [before.w, before.h], 'spinner shown: still the same size');
  await page.evaluate(() => window.__ok({ name: 'nightly-sync' }));
  const result = await page.evaluate(() => window.__result.then((r) => ({ status: r.status, id: r.dialog?.id })));
  assert.deepEqual(result, { status: 'open', id: 'run-dialog' });
  assert.equal(await page.evaluate(() => window.__openAtRender), false);
  const after = await state(page, slow);
  assert.equal(after.busy, null);
  assert.equal(after.disabled, null);
  assert.equal(after.dialogOpen, true);
  assert.equal(after.overlayOpen, false);
  assert.equal(await page.textContent('#run-dialog-title'), 'nightly-sync');
  await page.keyboard.press('Escape');
  await settles(page, (s) => document.activeElement === document.querySelector(s), 'closing returns focus to the trigger', slow);
  await page.close();
});

test('double-click: one load, one run; the busy trigger swallows clicks', async (t) => {
  const page = await open(t, URL_);
  if (!page) return;
  await arm(page);
  await page.evaluate(() => {
    window.__appClicks = 0;
    document.querySelector('#loading [data-demo-load="1500"]').addEventListener('click', () => { window.__appClicks += 1; });
  });
  await page.evaluate(() => window.__start('#loading [data-demo-load="1500"]'));
  const same = await page.evaluate(() => {
    const first = window.__result;
    window.__start('#loading [data-demo-load="1500"]');
    return first === window.__result;
  });
  assert.ok(same, 'same trigger returns the in-flight promise');
  await page.click(slow, { force: true });
  await page.click(slow, { force: true });
  assert.equal(await page.evaluate(() => window.__calls), 1, 'load ran once');
  assert.equal(await page.evaluate(() => window.__appClicks), 0, 'app handlers do not see clicks while busy');
  await page.evaluate(() => window.__ok({ name: 'x' }));
  await page.evaluate(() => window.__result);
  assert.equal(await page.evaluate(() => document.querySelectorAll('dialog[open]').length), 1);
  await page.close();
});

test('slow load: the loading overlay appears after the threshold, then gives way to the dialog', async (t) => {
  const page = await open(t, URL_);
  if (!page) return;
  await arm(page);
  await page.evaluate(() => window.__start('#loading [data-demo-load="1500"]', { label: 'Loading run…' }));
  await page.waitForTimeout(300);
  assert.equal((await state(page, slow)).overlayOpen, false, 'no overlay before --dk-loading-delay-overlay');
  await settles(page, () => !!document.querySelector('dialog.dk-loading[open]'), 'overlay after the threshold');
  assert.equal(await page.textContent('.dk-loading__label'), 'Loading run…');
  assert.ok(await page.evaluate(() => document.querySelector('dialog.dk-loading').matches(':modal')));
  await page.evaluate(() => window.__ok({ name: 'slow' }));
  assert.equal(await page.evaluate(() => window.__result.then((r) => r.status)), 'open');
  const s = await state(page, slow);
  assert.equal(s.overlayOpen, false);
  assert.equal(s.dialogOpen, true);
  await page.close();
});

test('a row trigger gets the overlay at the busy delay', async (t) => {
  const page = await open(t, URL_);
  if (!page) return;
  await arm(page);
  await page.evaluate(() => window.__start('#loading tbody tr'));
  await settles(page, () => !!document.querySelector('dialog.dk-loading[open]'), 'row: overlay at --dk-loading-delay-busy');
  assert.equal(await page.getAttribute('#loading tbody tr', 'aria-busy'), 'true');
  await page.evaluate(() => window.__ok({ name: 'row' }));
  assert.equal(await page.evaluate(() => window.__result.then((r) => r.status)), 'open');
  await page.close();
});

test('Escape aborts: before the overlay and on it; the signal fires, nothing opens, focus stays on the trigger', async (t) => {
  const page = await open(t, URL_);
  if (!page) return;
  await arm(page);
  await page.focus(slow);
  await page.evaluate(() => window.__start('#loading [data-demo-load="1500"]'));
  await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(() => window.__result.then((r) => r.status)), 'aborted');
  assert.ok(await page.evaluate(() => window.__signals[0].aborted));
  let s = await state(page, slow);
  assert.deepEqual([s.busy, s.disabled, s.dialogOpen, s.overlayOpen, s.focus], [null, null, false, false, true]);
  await page.evaluate(() => window.__ok({ name: 'late' }));
  await page.waitForTimeout(50);
  assert.equal((await state(page, slow)).dialogOpen, false, 'a late result is ignored');

  await page.evaluate(() => window.__start('#loading [data-demo-load="1500"]'));
  await settles(page, () => !!document.querySelector('dialog.dk-loading[open]'), 'overlay');
  await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(() => window.__result.then((r) => r.status)), 'aborted');
  s = await state(page, slow);
  assert.deepEqual([s.busy, s.dialogOpen, s.overlayOpen, s.focus], [null, false, false, true]);
  await page.close();
});

test('another trigger supersedes the running load', async (t) => {
  const page = await open(t, URL_);
  if (!page) return;
  await arm(page);
  await page.evaluate(() => { window.__start('#loading [data-demo-load="1500"]'); window.__first = window.__result; });
  await page.evaluate(() => window.__start('#loading [data-demo-load="80"]'));
  assert.equal(await page.evaluate(() => window.__first.then((r) => r.status)), 'aborted');
  assert.equal(await page.getAttribute(slow, 'aria-busy'), null);
  assert.equal(await page.getAttribute(fast, 'aria-busy'), 'true');
  await page.evaluate(() => window.__ok({ name: 'second' }));
  assert.equal(await page.evaluate(() => window.__result.then((r) => r.status)), 'open');
  await page.close();
});

test('error: no dialog, a danger toast with Retry; Retry loads again and opens', async (t) => {
  const page = await open(t, URL_);
  if (!page) return;
  await page.click(fails);
  await settles(page, () => !!document.querySelector('.dk-toast[role="alert"]'), 'toast after the failed load');
  let s = await state(page, fails);
  assert.equal(s.dialogOpen, false, 'no empty dialog');
  assert.equal(s.busy, null);
  assert.match(s.toast, /Couldn't load/);
  assert.equal(await page.evaluate(() => document.querySelectorAll('dialog.dk-loading[open]').length), 0);
  // Retry re-runs the same load: here one that fails once, then succeeds.
  await page.evaluate(() => {
    window.__tries = 0;
    const dialog = document.getElementById('run-dialog');
    dakitDialogs.openWhenReady(document.querySelector('#loading [data-demo-load="80"]'),
      () => (++window.__tries === 1 ? Promise.reject(new Error('503')) : Promise.resolve({ name: 'retried' })),
      (run) => { dialog.querySelector('#run-dialog-title').textContent = run.name; return dialog; });
  });
  await settles(page, () => window.__tries === 1 && !!document.querySelector('.dk-toast'), 'first attempt fails');
  await page.click('.dk-toast [data-dk-retry]');
  await settles(page, () => document.getElementById('run-dialog').open, 'Retry opens the dialog');
  assert.equal(await page.textContent('#run-dialog-title'), 'retried');
  assert.equal(await page.evaluate(() => document.querySelectorAll('.dk-toast').length), 0);
  await page.close();
});

test('onError replaces the toast and receives retry', async (t) => {
  const page = await open(t, URL_);
  if (!page) return;
  const r = await page.evaluate(async () => {
    const trigger = document.querySelector('#loading [data-demo-load="80"]');
    let retry = null;
    const result = await dakitDialogs.openWhenReady(trigger, () => Promise.reject(new Error('boom')), () => null, { onError: (e, again) => { retry = again; } });
    return { status: result.status, message: result.error.message, retry: typeof retry, toasts: document.querySelectorAll('.dk-toast').length };
  });
  assert.deepEqual(r, { status: 'error', message: 'boom', retry: 'function', toasts: 0 });
  await page.close();
});

test('spinner: rotates normally, stands still with reduced motion; busy button hides its label but keeps it', async (t) => {
  let page = await open(t, URL_, desktop, { reducedMotion: 'no-preference' });
  if (!page) return;
  const anim = (p) => p.evaluate(() => ({
    standalone: getComputedStyle(document.querySelector('#loading .dk-spinner')).animationName,
    button: getComputedStyle(document.querySelector('#loading .dk-button[aria-busy="true"]'), '::before').animationName,
  }));
  let a = await anim(page);
  assert.match(a.standalone, /dk-spin/);
  assert.match(a.button, /dk-spin/);
  await page.close();
  page = await open(t, URL_, desktop);
  a = await anim(page);
  assert.doesNotMatch(a.standalone, /dk-spin/);
  assert.doesNotMatch(a.button, /dk-spin/);
  const label = await page.evaluate(() => {
    const b = document.querySelector('#loading .dk-button[aria-busy="true"]');
    return { text: b.textContent, fill: getComputedStyle(b).webkitTextFillColor };
  });
  assert.equal(label.text, 'Save changes', 'label stays for assistive tech');
  assert.equal(label.fill, 'rgba(0, 0, 0, 0)', 'label is hidden visually');
  await page.close();
});

test('busy trigger keeps its accessible name after the spinner shows', async (t) => {
  const page = await open(t, URL_);
  if (!page) return;
  await arm(page);
  // Buttons label themselves three ways: bare text, an icon + a <span> label,
  // and an icon button named by aria-label. All three must stay findable by
  // role + name once the spinner has replaced the label on screen.
  await page.evaluate(() => {
    const row = document.createElement('div');
    row.className = 'row';
    row.innerHTML = '<button id="busy-span" class="dk-button dk-button--secondary" type="button">'
      + '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 13h3l7-7-3-3-7 7z"/></svg>'
      + '<span>Run now</span></button>'
      + '<button id="busy-icon" class="dk-icon-button" type="button" aria-label="Edit run">'
      + '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 13h3l7-7-3-3-7 7z"/></svg></button>';
    document.getElementById('loading').append(row);
  });
  const size = (sel) => page.evaluate((s) => { const r = document.querySelector(s).getBoundingClientRect(); return [r.width, r.height]; }, sel);
  const sizes = [await size(slow), await size('#busy-span'), await size('#busy-icon')];
  await page.evaluate(() => {
    window.__start('#loading [data-demo-load="1500"]');
    for (const id of ['busy-span', 'busy-icon']) {
      const b = document.getElementById(id);
      b.setAttribute('aria-busy', 'true');
      b.setAttribute('aria-disabled', 'true');
    }
  });
  await page.waitForTimeout(300); // past --dk-loading-delay-busy: the spinner is up
  for (const name of ['Open run (slow)', 'Run now', 'Edit run']) {
    const button = page.getByRole('button', { name, exact: true });
    assert.equal(await button.count(), 1, `"${name}" still resolves by role + name while busy`);
    assert.equal(await button.getAttribute('aria-busy'), 'true');
  }
  assert.deepEqual([await size(slow), await size('#busy-span'), await size('#busy-icon')], sizes, 'busy triggers keep their size');
  const hidden = await page.evaluate(() => [...document.querySelectorAll('#busy-span > *')].map((c) => getComputedStyle(c).opacity));
  assert.deepEqual(hidden, ['0', '0'], 'the label and icon are hidden on screen only');
  await page.evaluate(() => window.__ok({ name: 'nightly-sync' }));
  await page.close();
});

test('no page errors', () => {
  assert.deepEqual(errors, []);
});
