// Browser behaviour of the collection header (css .dk-collection-header + dist/collection.js) on showcase.html, headless.
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

async function open(t, viewport = { width: 1280, height: 900 }) {
  if (skip) { t.skip(skip); return null; }
  const page = await browser.newPage({ viewport, reducedMotion: 'reduce' });
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${base}/showcase.html?theme=light`);
  await page.waitForFunction(() => globalThis.dakitCollection && document.querySelector('[data-demo-collection-head] .dk-collection-header'));
  return page;
}
const status = (page) => page.textContent('[data-demo-collection-status]');

test('the create button follows its collection title; meta trails at the far end', async (t) => {
  const page = await open(t);
  if (!page) return;
  const g = await page.evaluate(() => {
    const head = document.querySelector('[data-demo-collection-head] .dk-collection-header');
    const box = (el) => el.getBoundingClientRect();
    const title = head.querySelector('.dk-collection-header__title');
    const create = head.querySelector('.dk-collection-create');
    const meta = head.querySelector('.dk-collection-header__meta');
    return {
      tag: title.tagName, gap: box(create).left - box(title).right, sameRow: Math.abs(box(create).top + box(create).height / 2 - (box(title).top + box(title).height / 2)),
      metaEnd: box(head).right - box(meta).right, label: create.textContent.trim(), cls: create.className,
      keys: create.getAttribute('aria-keyshortcuts'), title: create.title, flag: create.hasAttribute('data-dk-create'),
      icon: create.querySelector('.dk-collection-create__icon svg') !== null,
    };
  });
  assert.equal(g.tag, 'H3');
  assert.ok(g.gap >= 0 && g.gap <= 16, `create sits right after the title (gap ${g.gap})`);
  assert.ok(g.sameRow < 2, 'title and create share a row');
  assert.ok(g.metaEnd < 1, 'meta trails at the header end');
  assert.equal(g.label, 'New schedule');
  assert.match(g.cls, /dk-button--primary/);
  assert.match(g.cls, /dk-button--sm/);
  assert.equal(g.keys, 'c');
  assert.equal(g.title, 'New schedule (C)');
  assert.ok(g.flag && g.icon);
  // The markup twin renders the same structure; a second collection's create is secondary and unkeyed.
  const twin = await page.$eval('[data-demo-collection-empty-head] .dk-collection-create', (el) => [el.className, el.hasAttribute('data-dk-create'), el.getAttribute('aria-keyshortcuts')]);
  assert.match(twin[0], /dk-button--secondary/);
  assert.deepEqual(twin.slice(1), [false, null]);
  await page.close();
});

test('c presses the one visible create button, except while typing, with a modifier, or under a dialog', async (t) => {
  const page = await open(t);
  if (!page) return;
  await page.locator('body').click({ position: { x: 1, y: 1 } });
  await page.keyboard.press('c');
  assert.equal(await status(page), 'New schedule clicked');
  await page.evaluate(() => { document.querySelector('[data-demo-collection-status]').textContent = ''; });
  await page.keyboard.press('Shift+C');
  await page.keyboard.press('Control+c');
  assert.equal(await status(page), '', 'modifiers do not trigger it');
  await page.evaluate(() => { const i = document.createElement('input'); i.id = 'probe'; document.body.append(i); });
  await page.focus('#probe');
  await page.keyboard.press('c');
  assert.equal(await status(page), '', 'typing does not trigger it');
  assert.equal(await page.inputValue('#probe'), 'c');
  await page.evaluate(() => document.getElementById('demo-dialog').showModal());
  await page.keyboard.press('c');
  assert.equal(await status(page), '', 'an open dialog blocks it');
  await page.evaluate(() => document.getElementById('demo-dialog').close());
  // A hidden aria-modal panel (an app's closed popover) does not block it.
  await page.evaluate(() => { const p = document.createElement('section'); p.setAttribute('aria-modal', 'true'); p.hidden = true; p.id = 'hidden-modal'; document.body.append(p); document.activeElement.blur(); });
  await page.keyboard.press('c');
  assert.equal(await status(page), 'New schedule clicked', 'a hidden aria-modal panel does not block it');
  await page.evaluate(() => { document.getElementById('hidden-modal').hidden = false; document.getElementById('hidden-modal').textContent = 'open'; document.querySelector('[data-demo-collection-status]').textContent = ''; });
  await page.keyboard.press('c');
  assert.equal(await status(page), '', 'a showing aria-modal panel blocks it');
  await page.evaluate(() => document.getElementById('hidden-modal').remove());
  // A hidden create is skipped: nothing visible means nothing happens.
  await page.evaluate(() => { document.querySelector('[data-demo-collection-head]').hidden = true; document.activeElement.blur(); });
  await page.keyboard.press('c');
  assert.equal(await status(page), '');
  await page.close();
});

test('phone width: the header wraps with title and create together, create at the 44px touch target', async (t) => {
  const page = await open(t, { width: 360, height: 780 });
  if (!page) return;
  const g = await page.evaluate(() => {
    const head = document.querySelector('[data-demo-collection-head] .dk-collection-header');
    const box = (el) => el.getBoundingClientRect();
    const title = head.querySelector('.dk-collection-header__title');
    const create = head.querySelector('.dk-collection-create');
    return { h: box(create).height, row: Math.abs(box(create).top + box(create).height / 2 - (box(title).top + box(title).height / 2)), overflow: head.scrollWidth - head.clientWidth, right: box(create).right - box(head).right };
  });
  assert.equal(g.h, 44);
  assert.ok(g.row < 2, 'create stays beside its title');
  assert.ok(g.overflow <= 0 && g.right <= 0, 'the header fits its container');
  await page.close();
});

test('the DOM builder escapes nothing it should not and builds into any document', async (t) => {
  const page = await open(t);
  if (!page) return;
  const out = await page.evaluate(() => {
    const doc = document.implementation.createHTMLDocument('x');
    const header = dakitCollection.header({ title: '<b>Runs</b>', meta: '3 runs', actions: [doc.createElement('button')], document: doc });
    const markup = dakitCollection.headerMarkup({ title: '<b>Runs</b>', meta: '3 & more', titleId: 'runs' });
    return { owner: header.ownerDocument === doc, title: header.querySelector('h2').textContent, trail: header.querySelector('.dk-collection-header__trail').children.length, markup };
  });
  assert.ok(out.owner);
  assert.equal(out.title, '<b>Runs</b>');
  assert.equal(out.trail, 2);
  assert.match(out.markup, /<h2 class="dk-collection-header__title" id="runs">&lt;b&gt;Runs&lt;\/b&gt;<\/h2>/);
  assert.match(out.markup, /3 &amp; more/);
  await page.close();
});
