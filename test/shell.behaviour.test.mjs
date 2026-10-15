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

test('account menu: Tab past the last row out of the page closes it, and Tab back in keeps it closed', async (t) => {
  const page = await open(t, '/showcase-shell.html?theme=light');
  if (!page) return;
  await page.focus('.dk-account-trigger');
  await page.keyboard.press('Enter');
  await page.keyboard.press('End');
  assert.match((await focused(page)).text, /Sign out/);
  // Sign out is the last focusable element in the document, so Tab leaves the
  // page (relatedTarget null) instead of moving to another element.
  await page.keyboard.press('Tab');
  await settles(page, () => document.getElementById('dk-account-menu').hidden, 'menu closes when focus leaves the document');
  assert.equal(await page.getAttribute('.dk-account-trigger', 'aria-expanded'), 'false');
  await page.keyboard.press('Tab');
  assert.ok(!(await page.isVisible('#dk-account-menu')), 'Tab back in does not reopen it');
  assert.equal(await page.getAttribute('.dk-account-trigger', 'aria-expanded'), 'false');
  await page.close();
});

test('account menu: focus arriving outside it closes it, a window blur does not', async (t) => {
  const page = await open(t, '/showcase-shell.html?theme=light');
  if (!page) return;
  await page.focus('.dk-account-trigger');
  await page.keyboard.press('Enter');
  await page.evaluate(() => window.dispatchEvent(new FocusEvent('blur')));
  await page.evaluate(() => document.activeElement.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: null })));
  await page.waitForTimeout(50);
  assert.ok(await page.isVisible('#dk-account-menu'), 'focus still inside: stays open');
  await page.evaluate(() => document.querySelector('.dk-skip-link').focus());
  assert.ok(!(await page.isVisible('#dk-account-menu')), 'focus moved outside: closed');
  assert.equal(await page.getAttribute('.dk-account-trigger', 'aria-expanded'), 'false');
  await page.close();
});

test('account menu: an outside click on background returns focus to the trigger, on a control keeps it there', async (t) => {
  const page = await open(t, '/showcase-shell.html?theme=light');
  if (!page) return;
  await page.click('.dk-account-trigger');
  await page.keyboard.press('ArrowDown');
  const main = await page.locator('#main-content').boundingBox();
  await page.mouse.click(main.x + main.width - 24, main.y + main.height - 24);
  assert.ok(!(await page.isVisible('#dk-account-menu')));
  await settles(page, () => document.activeElement.matches('.dk-account-trigger'), 'background click: focus back on the trigger');

  await page.click('.dk-account-trigger');
  await page.keyboard.press('ArrowDown');
  const control = page.locator('#main-content').locator('button, a[href], input').first();
  await control.click();
  assert.ok(!(await page.isVisible('#dk-account-menu')));
  await page.waitForTimeout(50);
  assert.equal(await page.evaluate(() => document.activeElement === document.querySelector('#main-content').querySelector('button, a[href], input')), true, 'control click: focus stays on the control');
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
  assert.equal(await page.textContent('.dk-topbar__title'), 'DataOps', 'bar shows the wordmark; the h1 holds the page title');
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

// The drawer's open focus lands a frame or two after it becomes visible; wait
// for it, then move focus to the brand and confirm it is there.
async function focusBrand(page) {
  await settles(page, () => document.activeElement && document.activeElement.matches('.dk-sidebar [aria-current="page"], .dk-sidebar a, .dk-sidebar button'), 'drawer focus settled');
  await page.waitForTimeout(50);
  await page.locator('button.dk-brand').focus();
  await settles(page, () => document.activeElement.matches('button.dk-brand'), 'brand focused');
}

test('mobile: a brand switcher in the drawer takes over from it as the sheet under the bar', async (t) => {
  const page = await open(t, '/showcase-shell.html?theme=dark', { width: 390, height: 844 }, { hasTouch: true, isMobile: true });
  if (!page) return;
  // The showcase brand is a link; give it the switcher form (shell.md §5.1).
  await page.evaluate(() => {
    const shell = document.querySelector('.dk-shell');
    const brand = shell.querySelector('.dk-brand');
    const button = document.createElement('button');
    button.className = 'dk-brand';
    button.type = 'button';
    button.dataset.dkPopoverTrigger = 'dk-brand-menu';
    button.setAttribute('aria-haspopup', 'menu');
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-controls', 'dk-brand-menu');
    button.innerHTML = '<span class="dk-brand__name">DataOps</span><span class="dk-brand__scope">Acme</span>';
    brand.replaceWith(button);
    const menu = document.createElement('div');
    menu.className = 'dk-menu dk-brand-menu';
    menu.id = 'dk-brand-menu';
    menu.setAttribute('role', 'menu');
    menu.dataset.dkPopover = '';
    menu.hidden = true;
    menu.innerHTML = ['Acme', 'Globex', 'Initech'].map((n, i) => `<button class="dk-menu__item" type="button" role="menuitemradio" aria-checked="${i === 0}" tabindex="-1">${n}</button>`).join('');
    shell.append(menu);
  });
  await page.click('[data-dk-drawer-toggle]');
  await settles(page, () => document.querySelector('.dk-sidebar').contains(document.activeElement), 'focus enters the drawer');
  await page.click('button.dk-brand');
  assert.equal(await page.getAttribute('.dk-shell', 'data-drawer'), null, 'drawer closed');
  assert.ok(await page.isVisible('#dk-brand-menu'), 'switcher open');
  assert.equal(await page.evaluate(() => document.querySelector('.dk-main').inert), false, 'page no longer inert');
  assert.equal(await page.getAttribute('.dk-sidebar', 'role'), null, 'sidebar is a landmark again');
  assert.equal((await focused(page)).id, 'dk-brand-menu', 'focus in the switcher');
  const box = await page.locator('#dk-brand-menu').boundingBox();
  assert.ok(box.y >= 48, 'sheet sits under the 48px bar');
  await page.keyboard.press('ArrowDown');
  assert.equal((await focused(page)).text, 'Acme');
  await page.keyboard.press('ArrowDown');
  assert.equal((await focused(page)).text, 'Globex');
  await page.keyboard.press('Escape');
  assert.ok(await page.isHidden('#dk-brand-menu'), 'Escape closes it');
  assert.ok(await page.evaluate(() => document.activeElement.matches('[data-dk-drawer-toggle]')), 'focus returns to the menu button');
  // Reopen from the drawer and Tab out: it closes, and focus never lands in the hidden drawer.
  await page.click('[data-dk-drawer-toggle]');
  await settles(page, () => document.querySelector('.dk-sidebar').contains(document.activeElement), 'drawer reopens');
  await focusBrand(page);
  await page.keyboard.press('Enter');
  assert.equal((await focused(page)).text, 'Acme', 'keyboard opening focuses the first row');
  for (const key of ['Tab', 'Shift+Tab']) {
    await page.keyboard.press(key);
    await settles(page, () => document.getElementById('dk-brand-menu').hidden, `${key} out closes the switcher`);
    assert.equal(await page.evaluate(() => document.querySelector('.dk-sidebar').contains(document.activeElement)), false, `${key} does not land in the closed drawer`);
    assert.equal(await page.evaluate(() => document.querySelector('.dk-main').inert), false, 'nothing left inert');
    // Tab may land on the skip link, which covers the bar; reopen by keyboard.
    await page.locator('[data-dk-drawer-toggle]').focus();
    await page.keyboard.press('Enter');
    await focusBrand(page);
    await page.keyboard.press('Enter');
    assert.equal((await focused(page)).text, 'Acme');
  }
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

test('device login on touch: standalone links have a 44px hit area', async (t) => {
  const page = await open(t, '/showcase-device.html?theme=light&state=review', { width: 390, height: 844 }, { hasTouch: true });
  if (!page) return;
  await page.waitForSelector('.dk-auth-card__foot a');
  const heights = await page.evaluate(() => [...document.querySelectorAll('.dk-auth-page__identity a, .dk-auth-card__foot a')]
    .map((a) => { const r = a.getClientRects()[0]; return document.elementFromPoint(r.left + 4, r.top + 1) === a ? Math.round(r.height) : 0; }));
  assert.ok(heights.length >= 2 && heights.every((h) => h >= 44), `link hit heights ${heights}`);
  await page.close();
});

test('touch: every shell control is 44px; the coarse rail keeps its 56px column', async (t) => {
  const page = await open(t, '/showcase-shell.html?theme=light', { width: 1440, height: 900 }, { hasTouch: true, isMobile: true });
  if (!page) return;
  assert.ok(await page.evaluate(() => matchMedia('(pointer: coarse)').matches), 'context is a coarse pointer');
  const sizes = (sel) => page.evaluate((s) => [...document.querySelectorAll(s)]
    .filter((el) => el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden')
    .map((el) => { const r = el.getBoundingClientRect(); return `${Math.round(r.width)}x${Math.round(r.height)}`; }), sel);
  const controls = '.dk-sidebar :is(.dk-brand, .dk-search, .dk-search__rail, .dk-nav-item, .dk-account-trigger, .dk-icon-button)';
  const expanded = await sizes(controls);
  assert.ok(expanded.length > 5 && expanded.every((s) => +s.split('x')[1] >= 44), `expanded heights ${expanded}`);
  await page.evaluate(() => dakitShell.setSidebar(document.querySelector('.dk-shell'), 'collapsed'));
  await settles(page, () => document.querySelector('.dk-sidebar').getBoundingClientRect().width === 56, 'rail stays 56px');
  const rail = await sizes(controls);
  assert.ok(rail.length > 5 && rail.every((s) => s === '44x44'), `rail controls ${rail}`);
  await page.close();
});

test('touch: drawer search and brand are 44px', async (t) => {
  const page = await open(t, '/showcase-shell.html?theme=light', { width: 390, height: 844 }, { hasTouch: true, isMobile: true });
  if (!page) return;
  await page.click('[data-dk-drawer-toggle]');
  await settles(page, () => getComputedStyle(document.querySelector('.dk-sidebar')).visibility === 'visible', 'drawer opens');
  const heights = await page.evaluate(() => ['.dk-sidebar .dk-brand', '.dk-sidebar .dk-search', '.dk-sidebar__close']
    .map((s) => Math.round(document.querySelector(s).getBoundingClientRect().height)));
  assert.deepEqual(heights, [44, 44, 44]);
  await page.close();
});

test('copy: the width of "Copied" is reserved before the first click', async (t) => {
  const page = await open(t, '/showcase-device.html?theme=light&state=approved', { width: 390, height: 844 },
    { hasTouch: true, permissions: ['clipboard-read', 'clipboard-write'] });
  if (!page) return;
  const button = page.locator('.dk-code-block [data-dk-copy]');
  const before = await button.evaluate((b) => b.getBoundingClientRect().width);
  await button.click();
  await settles(page, () => document.querySelector('.dk-code-block [data-dk-copy]').textContent === 'Copied', 'label swaps to Copied');
  const after = await button.evaluate((b) => b.getBoundingClientRect().width);
  assert.equal(after, before, 'button width is stable');
  assert.ok(await button.evaluate((b) => b.getBoundingClientRect().height >= 44), '44px on touch');
  await page.close();
});

test('device login: a long identity wraps and Switch account stays whole', async (t) => {
  const page = await open(t, '/showcase-device.html?theme=light&state=review', { width: 390, height: 844 }, { hasTouch: true });
  if (!page) return;
  await page.evaluate(() => { document.querySelector('#identity').firstChild.textContent = 'grace.brewster.murray.hopper.long-address@engineering.datatalks.club · '; });
  const box = await page.evaluate(() => {
    const id = document.querySelector('#identity'); const a = id.querySelector('a'); const r = a.getBoundingClientRect();
    return { clipped: id.scrollWidth > id.clientWidth, lines: a.getClientRects().length, right: r.right, vw: innerWidth };
  });
  assert.equal(box.clipped, false, 'identity is not clipped');
  assert.equal(box.lines, 1, 'Switch account does not break');
  assert.ok(box.right <= box.vw, 'Switch account is inside the viewport');
  // Apps may use the sidebar's .dk-brand markup for the wordmark; it never truncates either.
  await page.evaluate(() => { document.querySelector('.dk-auth-page__brand').outerHTML = '<a class="dk-brand" href="#"><span class="dk-brand__name">DataOps</span></a>'; });
  const name = await page.evaluate(() => { const n = document.querySelector('.dk-auth-page__bar .dk-brand__name'); return { clipped: n.scrollWidth > n.clientWidth, height: n.closest('.dk-brand').getBoundingClientRect().height }; });
  assert.equal(name.clipped, false, 'wordmark is not truncated');
  assert.ok(name.height >= 44, `wordmark target ${name.height}`);
  await page.close();
});

test('no page errors', (t) => {
  if (skip) { t.skip(skip); return; }
  assert.deepEqual(errors, []);
});
