#!/usr/bin/env node
// Capture the live showcase without adding Playwright to dakit's dependencies.
import { createServer } from 'node:http';
import { mkdir, readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const usage = 'Usage: node scripts/shots.mjs [output-dir | --out output-dir]';
async function playwright() {
  const require = createRequire(import.meta.url);
  const candidates = process.env.PLAYWRIGHT_MODULE
    ? [process.env.PLAYWRIGHT_MODULE]
    : ['playwright', join(homedir(), 'git/dataops/node_modules/playwright/index.mjs')];
  for (const candidate of candidates) {
    try {
      const path = require.resolve(candidate);
      return await import(pathToFileURL(path).href);
    } catch (error) {
      if (process.env.PLAYWRIGHT_MODULE) throw error;
    }
  }
  throw new Error('Playwright not found. Set PLAYWRIGHT_MODULE to an installed Playwright module path.');
}
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.json': 'application/json' };
async function main() {
  const args = process.argv.slice(2);
  if (args[0] === '--help') { console.log(usage); return; }
  let output = join(homedir(), 'tmp/agent-reports/dakit-showcase');
  if (args.length === 1 && !args[0].startsWith('--')) output = resolve(args[0]);
  else if (args.length === 2 && args[0] === '--out') output = resolve(args[1]);
  else if (args.length) throw new Error(usage);
  const { chromium } = await playwright();
  await mkdir(output, { recursive: true });
  const server = createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      const path = resolve(root, `.${pathname}`);
      if (!path.startsWith(root + sep)) { res.writeHead(403).end(); return; }
      const body = await readFile(path);
      res.writeHead(200, { 'Content-Type': types[extname(path)] || 'application/octet-stream' });
      res.end(body);
    } catch { res.writeHead(404).end(); }
  });
  let browser;
  try {
    await new Promise((done, fail) => {
      server.once('error', fail);
      server.listen(0, '127.0.0.1', done);
    });
    browser = await chromium.launch({ headless: true });
    for (const theme of ['light', 'dark']) {
      for (const [device, width, height] of [['desktop', 1440, 900], ['mobile', 390, 844]]) {
        const context = await browser.newContext({ viewport: { width, height }, colorScheme: theme, deviceScaleFactor: 1, reducedMotion: 'reduce' });
        try {
          const page = await context.newPage();
          const errors = [];
          page.on('pageerror', (error) => errors.push(error.message));
          page.on('requestfailed', (request) => errors.push(`${request.url()}: ${request.failure()?.errorText}`));
          page.on('response', (response) => { if (response.status() >= 400) errors.push(`${response.url()}: HTTP ${response.status()}`); });
          await page.goto(`http://127.0.0.1:${server.address().port}/showcase.html?theme=${theme}`, { waitUntil: 'networkidle' });
          await page.evaluate(async (selected) => {
            document.documentElement.dataset.theme = selected;
            await document.fonts.ready;
          }, theme);
          if (errors.length) throw new Error(`${theme}/${device}: ${errors.join('; ')}`);
          const path = join(output, `showcase-${theme}-${device}-${width}.png`);
          await page.screenshot({ path, fullPage: true, animations: 'disabled' });
          console.log(path);
        } finally { await context.close(); }
      }
    }
  } finally {
    if (browser) await browser.close();
    if (server.listening) await new Promise((done) => server.close(done));
  }
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
