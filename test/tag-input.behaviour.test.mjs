// Browser behaviour of the tag input (css .dk-tag-input + dist/tag-input.js) on showcase.html, headless.
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
  assert.deepEqual(errors, [], 'no page errors');
});

async function open(t, theme = 'light', viewport = { width: 1280, height: 900 }) {
  if (skip) { t.skip(skip); return null; }
  const page = await browser.newPage({ viewport, reducedMotion: 'reduce' });
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${base}/showcase.html?theme=${theme}`);
  await page.waitForFunction(() => globalThis.dakitTagInput && document.querySelector('[data-demo-tags-needs] .dk-tag-input'));
  return page;
}

const NEEDS = '[data-demo-tags-needs]';
const input = `${NEEDS} [role="combobox"]`;
const chips = (page, root = NEEDS) => page.$$eval(`${root} .dk-tag-input__chip`, (els) => els.map((el) => el.dataset.value));
const options = (page, root = NEEDS) => page.$$eval(`${root} [role="option"]`, (els) => els.map((el) => el.textContent.trim()));
const activeLabel = (page) => page.$eval(input, (el) => {
  const id = el.getAttribute('aria-activedescendant');
  return id ? document.getElementById(id).textContent.trim() : null;
});

test('ARIA 1.2 combobox: combobox input, listbox popup, labelled chips with remove buttons', async (t) => {
  const page = await open(t);
  if (!page) return;
  const a = await page.$eval(input, (el) => ({
    role: el.getAttribute('role'), expanded: el.getAttribute('aria-expanded'), autocomplete: el.getAttribute('aria-autocomplete'),
    controls: el.getAttribute('aria-controls'), labelledby: el.getAttribute('aria-labelledby'),
    listRole: document.getElementById(el.getAttribute('aria-controls')).getAttribute('role'),
    described: document.getElementById(el.getAttribute('aria-describedby')).getAttribute('aria-label'),
  }));
  assert.deepEqual(a, { role: 'combobox', expanded: 'false', autocomplete: 'list', controls: a.controls, labelledby: 'demo-tags-needs-label', listRole: 'listbox', described: 'Selected Needs' });
  assert.deepEqual(await chips(page), ['finom', 'youtube']);
  assert.deepEqual(await page.$$eval(`${NEEDS} .dk-tag-input__remove`, (els) => els.map((el) => el.getAttribute('aria-label'))), ['Remove Finom', 'Remove YouTube']);
  await page.click(input);
  assert.equal(await page.getAttribute(input, 'aria-expanded'), 'true');
  assert.ok(!(await options(page)).includes('YouTube'), 'chosen values are not offered again');
  await page.close();
});

test('typing filters on label and aliases, case-insensitively; nothing matching says so', async (t) => {
  const page = await open(t);
  if (!page) return;
  await page.click(input);
  await page.keyboard.type('MAIL');
  assert.deepEqual(await options(page), ['Mailchimp', 'Gmail'], 'label prefix ranks first');
  assert.equal(await activeLabel(page), 'Mailchimp', 'the best match is active');
  assert.equal(await page.textContent(`${NEEDS} .dk-tag-input__match`), 'Mail');
  await page.fill(input, 'gcal');
  assert.deepEqual(await options(page), ['Google Calendar'], 'alias match');
  await page.fill(input, 'zz');
  assert.deepEqual(await options(page), []);
  assert.equal(await page.isVisible(`${NEEDS} .dk-tag-input__empty`), true);
  assert.equal(await page.textContent(`${NEEDS} .dk-tag-input__empty`), 'No matches');
  assert.equal(await page.getAttribute(input, 'aria-activedescendant'), null);
  await page.keyboard.press('Enter');
  assert.deepEqual(await chips(page), ['finom', 'youtube'], 'free text is never added');
  await page.close();
});

test('keyboard: arrows move, Enter adds, Backspace on empty removes the last chip, Esc closes then clears', async (t) => {
  const page = await open(t);
  if (!page) return;
  await page.focus(input);
  assert.equal(await page.getAttribute(input, 'aria-expanded'), 'false');
  await page.keyboard.press('ArrowDown');
  assert.equal(await page.getAttribute(input, 'aria-expanded'), 'true', 'ArrowDown opens');
  assert.equal(await activeLabel(page), 'StreamYard');
  await page.keyboard.press('ArrowDown');
  assert.equal(await activeLabel(page), 'Zoom');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('ArrowUp');
  assert.equal(await activeLabel(page), 'Accountant portal', 'wraps to the last');
  await page.keyboard.press('Enter');
  assert.deepEqual(await chips(page), ['finom', 'youtube', 'accountant']);
  assert.equal(await page.evaluate(() => document.activeElement.getAttribute('role')), 'combobox', 'focus stays in the field');
  assert.equal(await page.getAttribute(input, 'aria-expanded'), 'true', 'the list stays open for the next pick');
  assert.match(await page.textContent('[data-demo-tags-status]'), /\+accountant/);
  await page.waitForFunction((sel) => document.querySelector(sel).closest('.dk-tag-input').querySelector('[role="status"]').textContent.includes('Added Accountant portal'), input);
  await page.keyboard.type('zo');
  await page.keyboard.press('Enter');
  assert.deepEqual(await chips(page), ['finom', 'youtube', 'accountant', 'zoom']);
  assert.equal(await page.inputValue(input), '', 'adding clears the text');
  await page.keyboard.press('Backspace');
  assert.deepEqual(await chips(page), ['finom', 'youtube', 'accountant']);
  await page.keyboard.type('lu');
  await page.keyboard.press('Backspace');
  assert.deepEqual(await chips(page), ['finom', 'youtube', 'accountant'], 'Backspace edits text first');
  await page.keyboard.press('Escape');
  assert.equal(await page.getAttribute(input, 'aria-expanded'), 'false');
  assert.equal(await page.inputValue(input), 'l');
  await page.keyboard.press('Escape');
  assert.equal(await page.inputValue(input), '', 'a second Esc clears the text');
  await page.close();
});

test('mouse: click opens, clicking an option adds it, × removes, focus stays in the field', async (t) => {
  const page = await open(t);
  if (!page) return;
  await page.click(`${NEEDS} .dk-tag-input__field`, { position: { x: 270, y: 12 } });
  assert.equal(await page.getAttribute(input, 'aria-expanded'), 'true', 'a press on the field opens the list');
  await page.click(`${NEEDS} [role="option"]:has-text("Luma")`);
  assert.deepEqual(await chips(page), ['finom', 'youtube', 'luma']);
  assert.equal(await page.getAttribute(input, 'aria-expanded'), 'true');
  assert.equal(await page.evaluate(() => document.activeElement.getAttribute('role')), 'combobox');
  await page.hover(`${NEEDS} [role="option"]:has-text("Gmail")`);
  assert.equal(await activeLabel(page), 'Gmail', 'hover moves the active option');
  await page.click(`${NEEDS} .dk-tag-input__remove[aria-label="Remove YouTube"]`);
  assert.deepEqual(await chips(page), ['finom', 'luma']);
  assert.equal(await page.evaluate(() => document.activeElement.getAttribute('role')), 'combobox');
  await page.click('h2');
  await page.waitForFunction((sel) => document.querySelector(sel).getAttribute('aria-expanded') === 'false', input, { timeout: 2000 });
  await page.close();
});

test('groups render as labelled role=group sections', async (t) => {
  const page = await open(t);
  if (!page) return;
  const sel = '[data-demo-tags-people]';
  await page.click(`${sel} [role="combobox"]`);
  const groups = await page.$$eval(`${sel} [role="group"]`, (els) => els.map((el) => [document.getElementById(el.getAttribute('aria-labelledby')).textContent, el.querySelectorAll('[role="option"]').length]));
  assert.deepEqual(groups, [['Data', 3], ['Ops', 4], ['Design', 2]]);
  await page.keyboard.type('in');
  assert.deepEqual(await page.$$eval(`${sel} [role="group"]`, (els) => els.map((el) => el.querySelector('.dk-tag-input__group-label').textContent)), ['Design'], 'empty groups disappear');
  await page.close();
});

test('a long list scrolls inside a capped popup and keeps the active option in view', async (t) => {
  const page = await open(t);
  if (!page) return;
  await page.evaluate(() => {
    const host = document.createElement('div');
    host.id = 'long';
    host.style.maxWidth = '320px';
    document.querySelector('#tag-input').append(host);
    const options = Array.from({ length: 40 }, (_, i) => ({ value: `r${i}`, label: `Resource ${i + 1}` }));
    host.append(dakitTagInput.create({ label: 'Long', options }).element);
  });
  await page.click('#long [role="combobox"]');
  const box = await page.$eval('#long .dk-tag-input__popup', (el) => ({ h: el.clientHeight, sh: el.scrollHeight }));
  assert.ok(box.h <= 288 && box.sh > box.h, `capped and scrolling: ${JSON.stringify(box)}`);
  await page.keyboard.press('ArrowUp');
  assert.equal(await page.$eval('#long [role="combobox"]', (el) => document.getElementById(el.getAttribute('aria-activedescendant')).textContent), 'Resource 40');
  const visible = await page.$eval('#long .is-active', (el) => {
    const a = el.getBoundingClientRect(); const p = el.closest('.dk-tag-input__popup').getBoundingClientRect();
    return a.top >= p.top && a.bottom <= p.bottom;
  });
  assert.ok(visible, 'the active option is scrolled into view');
  await page.close();
});

test('disabled: no popup, no remove', async (t) => {
  const page = await open(t);
  if (!page) return;
  const sel = '[data-demo-tags-off]';
  assert.equal(await page.$eval(`${sel} [role="combobox"]`, (el) => el.disabled), true);
  assert.equal(await page.$eval(`${sel} .dk-tag-input__remove`, (el) => el.disabled), true);
  await page.click(`${sel} .dk-tag-input__field`, { force: true });
  assert.equal(await page.isVisible(`${sel} .dk-tag-input__popup`), false);
  await page.close();
});

test('375px phone: touch-sized, the field and popup stay inside the viewport, popup inside the viewport, tap adds', async (t) => {
  for (const theme of ['light', 'dark']) {
    const page = await open(t, theme, { width: 375, height: 812 });
    if (!page) return;
    await page.$eval(NEEDS, (el) => el.scrollIntoView({ block: 'start' }));
    await page.click(input);
    const m = await page.evaluate((sel) => {
      const root = document.querySelector(sel);
      const field = root.querySelector('.dk-tag-input__field').getBoundingClientRect();
      const popup = root.querySelector('.dk-tag-input__popup').getBoundingClientRect();
      const option = root.querySelector('[role="option"]').getBoundingClientRect();
      const remove = root.querySelector('.dk-tag-input__remove').getBoundingClientRect();
      return { field: field.height, left: popup.left, right: popup.right, option: option.height, remove: remove.height, overflow: Math.max(root.firstElementChild.getBoundingClientRect().right, popup.right) - innerWidth, inner: root.scrollWidth - root.clientWidth };
    }, NEEDS);
    assert.ok(m.field >= 44, `${theme}: field ${m.field}`);
    assert.ok(m.option >= 44, `${theme}: option ${m.option}`);
    assert.ok(m.remove >= 32, `${theme}: remove ${m.remove}`);
    assert.ok(m.left >= 0 && m.right <= 375, `${theme}: popup ${m.left}-${m.right}`);
    assert.ok(m.overflow <= 0 && m.inner <= 0, `${theme}: horizontal overflow ${m.overflow}/${m.inner}`);
    await page.click(`${NEEDS} [role="option"]:has-text("Zoom")`);
    assert.deepEqual(await chips(page), ['finom', 'youtube', 'zoom']);
    await page.close();
  }
});

test('chips and options read in both themes: neutral chip border, hover fill on the active option', async (t) => {
  for (const theme of ['light', 'dark']) {
    const page = await open(t, theme);
    if (!page) return;
    await page.focus(input);
    await page.keyboard.press('ArrowDown');
    const s = await page.evaluate((sel) => {
      const root = getComputedStyle(document.documentElement);
      const probe = (name) => { const d = document.createElement('div'); d.style.color = root.getPropertyValue(name).trim(); document.body.append(d); const c = getComputedStyle(d).color; d.remove(); return c; };
      const chip = getComputedStyle(document.querySelector(`${sel} .dk-tag-input__chip`));
      const act = getComputedStyle(document.querySelector(`${sel} .is-active`));
      return { chipBorder: chip.borderTopColor, strong: probe('--dk-border-strong'), activeBg: act.backgroundColor, hover: probe('--dk-bg-hover') };
    }, NEEDS);
    assert.equal(s.chipBorder, s.strong, `${theme}: chip border is neutral`);
    assert.equal(s.activeBg, s.hover, `${theme}: active option fill`);
    await page.close();
  }
});
