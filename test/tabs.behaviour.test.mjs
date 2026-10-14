// Browser behaviour of the segmented control (css .dk-tabs + dist/tabs.js) on showcase.html, headless.
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
  await page.waitForFunction(() => globalThis.dakitTabs);
  return page;
}

const state = (page, sel, attr) => page.$$eval(`${sel} .dk-tab`, (els, a) => els.map((el) => [el.textContent.trim().split(/\s+/)[0], el.getAttribute(a), el.getAttribute('tabindex')]), attr);

test('one look: the selected segment is the selection fill on the track, in both themes', async (t) => {
  for (const theme of ['light', 'dark']) {
    const page = await open(t, theme);
    if (!page) return;
    const s = await page.evaluate(() => {
      const root = getComputedStyle(document.documentElement);
      const v = (n) => root.getPropertyValue(n).trim();
      const probe = (color) => { const d = document.createElement('div'); d.style.color = color; document.body.append(d); const c = getComputedStyle(d).color; d.remove(); return c; };
      const track = document.getElementById('demo-filter');
      const [on, off] = track.querySelectorAll('.dk-tab');
      const cs = (el) => getComputedStyle(el);
      return {
        trackBorder: cs(track).borderTopColor, border: probe(v('--dk-border-default')),
        trackBg: cs(track).backgroundColor, muted: probe(v('--dk-bg-muted')),
        onBg: cs(on).backgroundColor, soft: probe(v('--dk-accent-soft')),
        onColor: cs(on).color, accent: probe(v('--dk-accent-default')),
        onCount: cs(on.querySelector('.dk-count')).color,
        offColor: cs(off).color, offBg: cs(off).backgroundColor, text: probe(v('--dk-text-muted')),
        countBg: cs(off.querySelector('.dk-count')).backgroundColor,
        countFont: cs(off.querySelector('.dk-count')).fontFamily,
        height: on.getBoundingClientRect().height,
        wrap: cs(track).flexWrap,
      };
    });
    assert.equal(s.trackBorder, s.border, `${theme}: neutral track border`);
    assert.equal(s.trackBg, s.muted, `${theme}: track fill`);
    assert.equal(s.onBg, s.soft, `${theme}: selected fill`);
    assert.equal(s.onColor, s.accent, `${theme}: selected text`);
    assert.equal(s.onCount, s.accent, `${theme}: selected count takes the selected text`);
    assert.equal(s.offColor, s.text, `${theme}: idle text`);
    assert.equal(s.offBg, 'rgba(0, 0, 0, 0)', `${theme}: idle segment is text on the track`);
    assert.equal(s.countBg, 'rgba(0, 0, 0, 0)', `${theme}: a count in a segment has no pill`);
    assert.match(s.countFont, /mono/i, `${theme}: counts are mono`);
    assert.equal(s.height, 28, `${theme}: default segment is 28px`);
    assert.equal(s.wrap, 'nowrap', `${theme}: the track never wraps`);
    await page.close();
  }
});

test('compact segments are 24px; touch widths grow every segment to 44px', async (t) => {
  const page = await open(t);
  if (!page) return;
  const sm = await page.$eval('.dk-tabs--sm .dk-tab', (el) => el.getBoundingClientRect().height);
  assert.equal(sm, 24);
  await page.setViewportSize({ width: 390, height: 844 });
  const phone = await page.$$eval('#segmented .dk-tab', (els) => els.map((el) => Math.round(el.getBoundingClientRect().height)));
  assert.ok(phone.every((h) => h === 44), `phone segments 44px: ${phone}`);
  await page.close();
});

test('radiogroup: roving tabindex, arrows choose and wrap, Home/End', async (t) => {
  const page = await open(t);
  if (!page) return;
  const sel = '#demo-filter';
  assert.deepEqual((await state(page, sel, 'aria-checked')).map((r) => r[2]), ['0', '-1', '-1', '-1']);
  await page.focus(`${sel} .dk-tab[aria-checked="true"]`);
  await page.keyboard.press('ArrowRight');
  assert.deepEqual(await state(page, sel, 'aria-checked'), [['All', 'false', '-1'], ['Grace', 'true', '0'], ['Valeriia', 'false', '-1'], ['Alexey', 'false', '-1']]);
  assert.equal(await page.evaluate(() => document.activeElement.textContent.trim()), 'Grace 3');
  assert.equal(await page.textContent('#demo-filter-out'), 'Showing 3', 'the app click handler ran');
  await page.keyboard.press('End');
  assert.equal((await state(page, sel, 'aria-checked'))[3][1], 'true');
  await page.keyboard.press('ArrowRight');
  assert.equal((await state(page, sel, 'aria-checked'))[0][1], 'true', 'wraps to the first');
  await page.keyboard.press('ArrowLeft');
  assert.equal((await state(page, sel, 'aria-checked'))[3][1], 'true', 'wraps to the last');
  await page.keyboard.press('Home');
  assert.equal((await state(page, sel, 'aria-checked'))[0][1], 'true');
  await page.close();
});

test('tablist: arrows switch panels and skip a disabled tab', async (t) => {
  const page = await open(t);
  if (!page) return;
  await page.focus('#demo-tab-steps');
  await page.keyboard.press('ArrowRight');
  assert.equal(await page.getAttribute('#demo-tab-log', 'aria-selected'), 'true');
  assert.equal(await page.isVisible('#demo-panel-log'), true);
  assert.equal(await page.isVisible('#demo-panel-steps'), false);
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  assert.equal(await page.getAttribute('#demo-tab-steps', 'aria-selected'), 'true', 'Output is disabled, so Input → Steps');
  await page.close();
});

test('a re-rendered track keeps keyboard focus on the chosen segment', async (t) => {
  const page = await open(t);
  if (!page) return;
  await page.evaluate(() => {
    const host = document.createElement('div');
    host.id = 'rerender-host';
    document.body.append(host);
    let chosen = 0;
    const render = () => {
      host.innerHTML = '';
      const g = document.createElement('div');
      g.className = 'dk-tabs';
      g.setAttribute('role', 'radiogroup');
      g.setAttribute('aria-label', 'Re-rendered filter');
      ['One', 'Two', 'Three'].forEach((label, i) => {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'dk-tab'; b.setAttribute('role', 'radio');
        b.setAttribute('aria-checked', String(i === chosen)); b.textContent = label;
        b.addEventListener('click', () => { chosen = i; render(); });
        g.append(b);
      });
      host.append(g);
    };
    render();
  });
  await page.focus('#rerender-host .dk-tab');
  assert.equal(await page.getAttribute('#rerender-host .dk-tab:nth-child(2)', 'tabindex'), '-1', 'synced on first focus');
  await page.keyboard.press('ArrowRight');
  assert.equal(await page.evaluate(() => document.activeElement.textContent), 'Two');
  assert.equal(await page.getAttribute('#rerender-host .dk-tab:nth-child(2)', 'aria-checked'), 'true');
  await page.close();
});

test('overflow scrolls inside the track instead of wrapping, and keeps the choice in view', async (t) => {
  const page = await open(t);
  if (!page) return;
  const m = await page.$eval('[aria-label="Newsletter issues"]', (el) => ({ scroll: el.scrollWidth > el.clientWidth, h: el.getBoundingClientRect().height, segH: el.querySelector('.dk-tab').getBoundingClientRect().height }));
  assert.ok(m.scroll, 'segments overflow the 320px track');
  assert.ok(m.h < m.segH * 2, 'one row');
  await page.focus('[aria-label="Newsletter issues"] .dk-tab');
  await page.keyboard.press('End');
  const visible = await page.$eval('[aria-label="Newsletter issues"]', (el) => {
    const seg = el.querySelector('[aria-checked="true"]');
    const a = el.getBoundingClientRect(); const b = seg.getBoundingClientRect();
    return b.left >= a.left - 1 && b.right <= a.right + 1;
  });
  assert.ok(visible, 'the chosen last segment is scrolled into view');
  await page.close();
});

test('a track inside a dialog head stays one row (the head stacks only its title block)', async (t) => {
  const page = await open(t);
  if (!page) return;
  const rows = await page.evaluate(() => {
    const head = document.createElement('div');
    head.className = 'dk-dialog__head';
    head.innerHTML = '<div><h2>Issue</h2><p>Sub</p></div><div class="dk-tabs" role="tablist" aria-label="Issue views"><button class="dk-tab" role="tab" aria-selected="true">Details</button><button class="dk-tab" role="tab" aria-selected="false">Compose</button></div>';
    document.body.append(head);
    const tops = [...head.querySelectorAll('.dk-tab')].map((el) => Math.round(el.getBoundingClientRect().top));
    head.remove();
    return new Set(tops).size;
  });
  assert.equal(rows, 1);
  await page.close();
});
