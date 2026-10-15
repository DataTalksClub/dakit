// Browser behaviour of the list–detail split (css .dk-split + dist/split.js) on showcase-split.html, headless.
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
const phone = { width: 390, height: 844 };
const firstItems = (page) => page.evaluate(() => [...document.querySelectorAll('.dk-split__item')].slice(0, 3).map((a) => a.getAttribute('href')));

test('fill: the page never scrolls, each pane scrolls on its own', async (t) => {
  const page = await open(t, '/showcase-split.html?theme=light&run=r1038', desktop);
  if (!page) return;
  const m = await page.evaluate(() => {
    const main = document.querySelector('.dk-main');
    const list = document.querySelector('.dk-split__list .dk-split__scroll');
    const detail = document.querySelector('.dk-split__detail .dk-split__scroll');
    const before = { list: list.scrollTop, detail: detail.scrollTop };
    list.scrollTop = 600;
    const afterList = { list: list.scrollTop, detail: detail.scrollTop };
    detail.scrollTop = 200;
    return {
      doc: document.scrollingElement.scrollHeight - innerHeight,
      main: main.scrollHeight - main.clientHeight,
      listOverflow: list.scrollHeight > list.clientHeight,
      detailOverflow: detail.scrollHeight > detail.clientHeight,
      before, afterList, afterDetail: { list: list.scrollTop, detail: detail.scrollTop },
      splitBottom: Math.round(document.querySelector('.dk-split').getBoundingClientRect().bottom),
    };
  });
  assert.equal(m.doc, 0, 'document does not scroll');
  assert.equal(m.main, 0, '.dk-main does not scroll');
  assert.ok(m.listOverflow && m.detailOverflow, 'both panes have more content than fits');
  assert.equal(m.afterList.list, 600, 'list scrolls');
  assert.equal(m.afterList.detail, m.before.detail, 'scrolling the list leaves the detail alone');
  assert.equal(m.afterDetail.list, 600, 'scrolling the detail leaves the list alone');
  assert.ok(m.splitBottom <= desktop.height, `split fits the viewport (${m.splitBottom})`);
  await page.close();
});

test('selection: accent-soft fill, neutral divider, hover keeps the fill', async (t) => {
  const page = await open(t, '/showcase-split.html?theme=light&run=r1039', desktop);
  if (!page) return;
  // Reduced motion still runs 0.01ms transitions (base.css), so computed
  // colours are read a tick after anything changes.
  const read = () => page.evaluate(async () => {
    const probes = Object.fromEntries(['--dk-accent-soft', '--dk-border-default', '--dk-accent-default'].map((v) => {
      const probe = document.createElement('i');
      probe.style.color = `var(${v})`;
      document.body.append(probe);
      return [v, probe];
    }));
    await new Promise((done) => setTimeout(done, 50));
    const row = document.querySelector('.dk-split__item[aria-current="true"]');
    const cs = getComputedStyle(row);
    const colour = (v) => getComputedStyle(probes[v]).color;
    const out = {
      bg: cs.backgroundColor, soft: colour('--dk-accent-soft'),
      borders: [cs.borderTopWidth, cs.borderRightWidth, cs.borderLeftWidth], divider: cs.borderBottomColor, neutral: colour('--dk-border-default'),
      name: getComputedStyle(row.querySelector('.dk-split__name')).color, accent: colour('--dk-accent-default'),
    };
    Object.values(probes).forEach((p) => p.remove());
    return out;
  });
  const before = await read();
  assert.equal(before.bg, before.soft, 'selected fill is accent-soft');
  assert.deepEqual(before.borders, ['0px', '0px', '0px'], 'no edge accents');
  assert.equal(before.divider, before.neutral, 'divider stays neutral');
  assert.equal(before.name, before.accent, 'selected name is accent text');
  await page.hover('.dk-split__item[aria-current="true"]');
  assert.equal((await read()).bg, before.soft, 'hover keeps the selected fill');
  await page.close();
});

test('empty detail: nothing selected shows the empty state', async (t) => {
  const page = await open(t, '/showcase-split.html?theme=dark', desktop);
  if (!page) return;
  assert.equal(await page.locator('.dk-split__detail .dk-split__empty .dk-empty__title').textContent(), 'Select a run');
  assert.equal(await page.locator('.dk-split__item[aria-current]').count(), 0);
  await page.close();
});

test('keyboard: ↑/↓/Home/End move focus, Enter opens and focus stays on the row', async (t) => {
  const page = await open(t, '/showcase-split.html?theme=light', desktop);
  if (!page) return;
  const hrefs = await firstItems(page);
  await page.focus('.dk-split__item');
  await page.keyboard.press('ArrowDown');
  assert.equal(await page.evaluate(() => document.activeElement.getAttribute('href')), hrefs[1]);
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('ArrowUp');
  assert.equal(await page.evaluate(() => document.activeElement.getAttribute('href')), hrefs[0], 'ArrowUp stops at the first row');
  await page.keyboard.press('End');
  const last = await page.evaluate(() => { const all = document.querySelectorAll('.dk-split__item'); return document.activeElement === all[all.length - 1]; });
  assert.ok(last, 'End jumps to the last row');
  await page.keyboard.press('Home');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await settles(page, (h) => location.search.includes('run=') && document.activeElement.matches('.dk-split__item[aria-current="true"]') && document.activeElement.getAttribute('href') === h,
    'after the list re-renders, focus is back on the opened row', hrefs[1]);
  assert.match(await page.locator('.dk-split__detail .dk-split__title').textContent(), /#1039/);
  await page.close();
});

test('keyboard: arrows inside a field in the list are left alone', async (t) => {
  const page = await open(t, '/showcase-split.html?theme=light', desktop);
  if (!page) return;
  await page.focus('#runs-search');
  await page.keyboard.press('ArrowDown');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'runs-search');
  await page.close();
});

test('phone: one pane at a time, URL-driven, Back returns focus to the row', async (t) => {
  const page = await open(t, '/showcase-split.html?theme=light', phone, { hasTouch: true, isMobile: true });
  if (!page) return;
  const shown = () => page.evaluate(() => ({
    list: getComputedStyle(document.querySelector('.dk-split__list')).display !== 'none',
    detail: getComputedStyle(document.querySelector('.dk-split__detail')).display !== 'none',
    view: document.querySelector('.dk-split').dataset.view,
  }));
  assert.deepEqual(await shown(), { list: true, detail: false, view: 'list' });
  const rowHeight = await page.evaluate(() => document.querySelector('.dk-split__item').getBoundingClientRect().height);
  assert.ok(rowHeight >= 44, `row is a 44px target (${rowHeight})`);
  await page.click('.dk-split__item >> nth=2');
  await settles(page, () => document.activeElement.matches('.dk-split__detail .dk-split__title'), 'opening moves focus to the detail heading');
  assert.deepEqual(await shown(), { list: false, detail: true, view: 'detail' });
  const back = await page.evaluate(() => document.querySelector('.dk-split__back').getBoundingClientRect().height);
  assert.ok(back >= 44, `Back is a 44px target (${back})`);
  await page.click('.dk-split__back');
  await settles(page, () => !location.search.includes('run=') && document.activeElement.matches('.dk-split__item'), 'Back focuses a row in the list');
  assert.deepEqual(await shown(), { list: true, detail: false, view: 'list' });
  // A deep link opens straight into the detail.
  await page.goto(page.url().replace(/\?.*/, '?theme=light&run=r1030'));
  assert.deepEqual(await shown(), { list: false, detail: true, view: 'detail' });
  await page.goBack();
  await settles(page, () => document.querySelector('.dk-split').dataset.view === 'list', 'history back shows the list');
  await page.close();
});

test('resize grip: keyboard steps 16px, clamps, persists per data-dk-split key', async (t) => {
  const page = await open(t, '/showcase-split.html?theme=light', desktop);
  if (!page) return;
  const width = () => page.evaluate(async () => { await new Promise((done) => setTimeout(done, 50)); return Math.round(document.querySelector('.dk-split__list').getBoundingClientRect().width); });
  const start = await width();
  assert.equal(start, 320, 'default list width is --dk-size-split-list');
  assert.equal(await page.getAttribute('.dk-split__handle', 'role'), 'separator');
  await page.focus('.dk-split__handle');
  await page.keyboard.press('ArrowRight');
  assert.equal(await width(), start + 16);
  assert.equal(await page.evaluate(() => localStorage.getItem('dk-split:demo-runs')), String(start + 16));
  await page.keyboard.press('Home');
  assert.equal(await width(), 240, 'Home clamps to the 240px minimum');
  await page.keyboard.press('End');
  const max = await page.evaluate(() => Math.floor(document.querySelector('.dk-split').getBoundingClientRect().width / 2));
  assert.ok(Math.abs((await width()) - max) <= 1, 'End clamps to half the split');
  await page.reload();
  assert.ok(Math.abs((await width()) - max) <= 1, 'the width survives a reload');
  // Drag with the pointer.
  const box = await page.locator('.dk-split__handle').boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + 100);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 - 200, box.y + 100, { steps: 4 });
  await page.mouse.up();
  const dragged = await width();
  assert.ok(Math.abs(dragged - (max - 200)) <= 2, `drag resizes (${dragged})`);
  await page.close();
});

test('fill: a hidden split (an inactive tab) leaves the page scrolling normally', async (t) => {
  const page = await open(t, '/showcase-split.html?theme=light', desktop);
  if (!page) return;
  const display = () => page.evaluate(() => getComputedStyle(document.querySelector('.dk-main')).display);
  assert.equal(await display(), 'flex');
  await page.evaluate(() => { document.querySelector('.dk-split').hidden = true; });
  assert.equal(await display(), 'block');
  await page.close();
});

test('no page errors', (t) => {
  if (skip) { t.skip(skip); return; }
  assert.deepEqual(errors, []);
});

test('sticky section anchors clear the band after it resizes', async (t) => {
  const page = await open(t, '/showcase-split.html?run=r1039', desktop);
  if (!page) return;
  await page.evaluate(() => {
    const scroller = document.querySelector('.dk-split__detail .dk-split__scroll');
    scroller.classList.add('dk-split__scroll--flush');
    scroller.innerHTML = '<nav class="dk-split__sticky" style="height:48px">Sections</nav><div style="height:600px"></div><h3 id="anchor">Section</h3><div style="height:900px"></div>';
  });
  for (const height of [48, 88]) {
    await page.locator('.dk-split__sticky').evaluate((node, px) => { node.style.height = px + 'px'; }, height);
    await page.waitForFunction(px => parseFloat(getComputedStyle(document.querySelector('.dk-split__scroll--flush')).scrollPaddingTop) >= px, height);
    const offset = await page.locator('#anchor').evaluate(node => {
      node.scrollIntoView({ block: 'start' });
      return node.getBoundingClientRect().top - document.querySelector('.dk-split__sticky').getBoundingClientRect().bottom;
    });
    assert.ok(offset >= 0, `anchor clears the ${height}px sticky band`);
  }
  await page.close();
});
