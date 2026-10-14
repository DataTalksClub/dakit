// Browser behaviour of dist/shell.js and the device-login demo, headless.
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
const focused = (page) => page.evaluate(() => {
  const el = document.activeElement;
  return { cls: el.className, text: el.textContent.trim().slice(0, 24), id: el.id, ring: el.matches(':focus-visible') };
});

test('account menu: pointer opening focuses the container, keyboard opening the first row', async (t) => {
  const page = await open(t, '/showcase-shell.html?theme=light');
  if (!page) return;
  await page.click('.dk-account-trigger');
  assert.ok(await page.isVisible('#dk-account-menu'));
  assert.equal(await page.getAttribute('.dk-account-trigger', 'aria-expanded'), 'true');
  let f = await focused(page);
  assert.equal(f.id, 'dk-account-menu', 'pointer: container focused');
  assert.equal(await page.locator('#dk-account-menu .dk-menu__item:focus-visible').count(), 0, 'pointer: no row ring');
  await page.keyboard.press('ArrowDown');
  f = await focused(page);
  assert.match(f.text, /Grace/, 'ArrowDown enters the first row');
  await page.keyboard.press('Escape');
  assert.ok(!(await page.isVisible('#dk-account-menu')));
  assert.match((await focused(page)).cls, /dk-account-trigger/, 'Esc returns focus');

  await page.keyboard.press('Enter');
  f = await focused(page);
  assert.match(f.text, /Grace/, 'keyboard: first row focused');
  assert.ok(f.ring, 'keyboard: ring visible');
  await page.keyboard.press('ArrowDown');
  assert.match((await focused(page)).text, /Ana/);
  await page.keyboard.press('End');
  assert.match((await focused(page)).text, /Sign out/);
  await page.keyboard.press('Escape');
  await page.close();
});

test('popovers: single open, outside click, theme switch persists', async (t) => {
  const page = await open(t, '/showcase-shell.html?theme=light');
  if (!page) return;
  assert.equal(await page.getAttribute('.dk-notif-trigger', 'aria-label'), 'Notifications, 3 unread');
  await page.click('.dk-notif-trigger');
  assert.ok(await page.isVisible('#dk-notif-panel'));
  await page.click('.dk-account-trigger');
  assert.ok(!(await page.isVisible('#dk-notif-panel')) && await page.isVisible('#dk-account-menu'));
  await page.mouse.click(900, 600);
  assert.ok(!(await page.isVisible('#dk-account-menu')));
  await page.click('.dk-account-trigger');
  await page.click('[data-dk-theme-toggle]');
  assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), 'dark');
  assert.equal(await page.evaluate(() => localStorage.getItem('dakit-theme')), 'dark');
  assert.equal(await page.getAttribute('[data-dk-theme-toggle]', 'aria-checked'), 'true');
  await page.close();
});

test('counts: hidden at 0, exact to 99, then 99+', async (t) => {
  const page = await open(t, '/showcase-shell.html?theme=light');
  if (!page) return;
  const out = await page.evaluate(() => {
    const c = document.getElementById('bell-count');
    return [0, 5, 99, 100, 2500, -1].map((n) => { dakitShell.setCount(c, n); return c.hidden ? 'hidden' : c.textContent; }).join(',');
  });
  assert.equal(out, 'hidden,5,99,99+,99+,hidden');
  assert.equal(await page.getAttribute('.dk-notif-trigger', 'aria-label'), 'Notifications');
  await page.close();
});

test('rail: Ctrl+B collapses to 56px, popovers open beside it, / expands to search', async (t) => {
  const page = await open(t, '/showcase-shell.html?theme=light');
  if (!page) return;
  await page.keyboard.press('Control+b');
  assert.equal(await page.getAttribute('.dk-shell', 'data-sidebar'), 'collapsed');
  assert.equal(await page.getAttribute('.dk-sidebar__toggle', 'aria-label'), 'Expand sidebar');
  await settles(page, () => document.querySelector('.dk-sidebar').getBoundingClientRect().width === 56, 'rail is 56px');
  await page.click('.dk-account-trigger');
  await settles(page, () => document.getElementById('dk-account-menu').getBoundingClientRect().left === 64, 'menu opens beside the rail');
  await page.keyboard.press('Escape');
  await page.keyboard.press('/');
  assert.equal(await page.getAttribute('.dk-shell', 'data-sidebar'), 'expanded');
  await settles(page, () => document.activeElement.type === 'search', '/ focuses search');
  await settles(page, () => document.querySelector('.dk-sidebar').getBoundingClientRect().width === 240, 'sidebar back to 240px');
  await page.close();
});

test('mobile: triggers move to the bar, drawer traps focus and returns it', async (t) => {
  const page = await open(t, '/showcase-shell.html?theme=light', { width: 390, height: 844 }, { hasTouch: true });
  if (!page) return;
  assert.ok(await page.evaluate(() => !!document.querySelector('.dk-topbar__end .dk-notif-trigger') && !!document.querySelector('.dk-topbar__end .dk-account-trigger')));
  assert.equal(await page.evaluate(() => document.querySelectorAll('.dk-notif-trigger').length), 1);
  const attrs = () => page.evaluate(() => { const a = document.querySelector('.dk-sidebar'); return ['role', 'aria-modal', 'aria-label'].map((n) => a.getAttribute(n)).join('|'); });
  assert.equal(await attrs(), '||Workspace', 'closed drawer is a plain landmark');
  await page.click('[data-dk-drawer-toggle]');
  assert.equal(await page.getAttribute('.dk-shell', 'data-drawer'), 'open');
  assert.equal(await attrs(), 'dialog|true|Workspace', 'open drawer is a named modal dialog');
  await page.evaluate(() => dakitShell.toggleDrawer(document.querySelector('.dk-shell'), true));
  assert.equal(await attrs(), 'dialog|true|Workspace', 're-opening keeps the saved originals');
  assert.ok(await page.evaluate(() => document.querySelector('.dk-main').inert));
  await settles(page, () => document.querySelector('.dk-sidebar').contains(document.activeElement), 'focus enters the drawer');
  for (let i = 0; i < 30; i++) await page.keyboard.press('Tab');
  assert.ok(await page.evaluate(() => document.querySelector('.dk-sidebar').contains(document.activeElement)));
  await page.keyboard.press('Escape');
  assert.equal(await page.getAttribute('.dk-shell', 'data-drawer'), null);
  assert.equal(await attrs(), '||Workspace', 'closing restores the original attributes');
  assert.ok(await page.evaluate(() => document.activeElement.matches('[data-dk-drawer-toggle]')));
  await page.click('[data-dk-drawer-toggle]');
  assert.equal(await attrs(), 'dialog|true|Workspace');
  await page.setViewportSize({ width: 1200, height: 800 });
  await settles(page, () => !document.querySelector('.dk-sidebar').hasAttribute('role') && !document.querySelector('.dk-sidebar').hasAttribute('aria-modal'), 'resizing to desktop drops the dialog semantics');
  await settles(page, () => !!document.querySelector('.dk-sidebar__head .dk-notif-trigger') && !!document.querySelector('.dk-sidebar__foot .dk-account-trigger'), 'triggers move back on desktop');
  await page.close();
});

test('device login: formats, never truncates, focus never on Authorize, prefill never advances', async (t) => {
  const page = await open(t, '/showcase-device.html?theme=light');
  if (!page) return;
  await page.keyboard.type('wxzb cdfg');
  assert.equal(await page.inputValue('#device-code'), 'WXZB-CDFG');
  await page.keyboard.type('x');
  assert.ok(await page.isDisabled('#continue'));
  assert.match(await page.textContent('#code-error'), /has 9/);
  await page.keyboard.press('Backspace');
  assert.ok(!(await page.isDisabled('#continue')));
  await page.keyboard.press('Enter');
  await page.waitForSelector('#approve');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'card-title');
  assert.ok(await page.isDisabled('#approve'), 'different network gates Authorize');
  await page.check('#ack');
  await page.click('#approve');
  await page.waitForSelector('text=Device authorized');
  await page.goto(base + '/showcase-device.html?theme=light&code=bcdf-ghjk');
  assert.equal(await page.inputValue('#device-code'), 'BCDF-GHJK');
  assert.ok(!(await page.isVisible('#approve')));
  assert.ok(!page.url().includes('code='));
  await page.close();
});

test('no page errors', (t) => {
  if (skip) { t.skip(skip); return; }
  assert.deepEqual(errors, []);
});
