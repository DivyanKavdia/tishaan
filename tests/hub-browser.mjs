import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile, mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
const project = fileURLToPath(new URL('../', import.meta.url));
const root = process.env.ARENA_SOURCE_SITE ? project : path.join(project, 'dist');
const output = path.join(project, 'test-results');
await mkdir(output, { recursive: true });
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png' };
let legacy = false;
const legacyWorker = `const CACHE='avengers-arena-v2'; self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(['./','./index.html'])))); self.addEventListener('fetch',e=>{if(e.request.method==='GET')e.respondWith(fetch(e.request).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))));});`;
const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://localhost');
    if (!url.pathname.startsWith('/tishaan/')) { response.writeHead(404); response.end('Not found'); return; }
    let file = decodeURIComponent(url.pathname.slice('/tishaan/'.length)) || 'index.html';
    if (legacy && ['index.html', 'sw.js'].includes(file)) {
      response.writeHead(200, { 'Content-Type': types[path.extname(file)], 'Cache-Control': 'no-store' });
      response.end(file === 'sw.js' ? legacyWorker : '<!doctype html><h1>Old Avengers homepage</h1><script>navigator.serviceWorker.register("./sw.js")</script>'); return;
    }
    file = path.resolve(root, file);
    if (!file.startsWith(root + path.sep)) { response.writeHead(403); response.end('Forbidden'); return; }
    if ((await stat(file)).isDirectory()) file = path.join(file, 'index.html');
    const content = await readFile(file);
    response.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    response.end(content);
  } catch { response.writeHead(404); response.end('Not found'); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const url = `http://127.0.0.1:${server.address().port}/tishaan/`;
const options = { headless: true, ...(process.env.ARENA_CHROMIUM_EXECUTABLE ? { executablePath: process.env.ARENA_CHROMIUM_EXECUTABLE } : {}), ...(process.env.ARENA_SINGLE_PROCESS ? { args: ['--no-sandbox', '--no-zygote', '--single-process', '--disable-dev-shm-usage'] } : {}) };
const ready = async page => {
  await page.waitForLoadState('load');
  await page.waitForFunction(async () => {
    const registration = await navigator.serviceWorker.getRegistration(location.href);
    return registration?.scope === new URL('./', location.href).href && registration.active?.state === 'activated';
  });
};
const fits = async page => assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), 'Horizontal overflow');

try {
  for (const [name, width, height, mobile] of [['phone', 390, 844, true], ['small-phone', 320, 568, true], ['landscape', 844, 390, true], ['desktop', 1440, 1000, false]]) {
    if (process.env.HUB_BROWSER_PROFILE && name !== process.env.HUB_BROWSER_PROFILE) continue;
    const browser = await chromium.launch(options);
    try {
      const context = await browser.newContext({ viewport: { width, height }, isMobile: mobile, hasTouch: mobile, reducedMotion: 'reduce' });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(url);
      assert.equal(await page.title(), 'Tishaan’s Game Zone');
      await ready(page); await fits(page);
      await page.locator('#games').scrollIntoViewIfNeeded();
      await page.waitForFunction(() => [...document.images].every(image => image.complete && image.naturalWidth > 0));
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: path.join(output, `hub-${name}.png`), fullPage: true });
      assert.equal(await page.locator('.game-card').count(), 1);
      await page.getByRole('button', { name: 'Action', exact: false }).click();
      assert.equal(await page.locator('.game-card:visible').count(), 1);
      await page.locator('#game-search').fill('not-a-game');
      assert.ok(await page.locator('#empty-state').isVisible());
      assert.equal(await page.locator('.game-card:visible').count(), 0);
      await page.getByRole('button', { name: 'Show all games' }).click();
      assert.equal(await page.locator('.game-card:visible').count(), 1);
      await page.locator('#game-search').fill('avengers');
      await page.getByRole('link', { name: 'Play Avengers Arena', exact: true }).click();
      assert.equal(new URL(page.url()).pathname, '/tishaan/games/avengers-arena/');
      await page.locator('.hero-card').first().waitFor();
      await ready(page);
      assert.equal(await page.locator('.hero-card').count(), 4);
      await page.getByRole('button', { name: 'ENTER THE ARENA' }).click();
      await fits(page);
      for (const button of await page.locator('[data-input]').all()) {
        const box = await button.boundingBox();
        assert.ok(box.x >= 0 && box.x + box.width <= width + 1, `${name}: control outside width`);
        if (mobile) assert.ok(box.y >= 0 && box.y + box.height <= height + 1, `${name}: control below viewport`);
      }
      await page.getByRole('link', { name: 'Back to Tishaan’s Game Zone' }).click();
      assert.equal(await page.title(), 'Tishaan’s Game Zone');
      if (name === 'phone') {
        await context.setOffline(true); await page.reload();
        await page.getByRole('link', { name: 'Play Avengers Arena', exact: true }).click();
        await page.locator('.hero-card').first().waitFor();
        assert.equal(await page.locator('.hero-card').count(), 4);
        await page.getByRole('button', { name: 'ENTER THE ARENA' }).click();
        assert.ok(await page.locator('#game-screen').isVisible());
        await page.getByRole('link', { name: 'Back to Tishaan’s Game Zone' }).click();
        assert.equal(await page.title(), 'Tishaan’s Game Zone');
        await context.setOffline(false);
      }
      await page.getByRole('button', { name: 'Play a surprise game' }).click();
      assert.ok(page.url().endsWith('/games/avengers-arena/'));
      assert.deepEqual(errors, []);
      console.log(`PASS hub ${name}: artwork, layout, search, filters, launch, controls, return, surprise${name === 'phone' ? ', offline round trip' : ''}`);
    } finally { await browser.close(); }
  }
  if (!process.env.HUB_BROWSER_PROFILE || process.env.HUB_BROWSER_PROFILE === 'phone') {
    const browser = await chromium.launch(options);
    try {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
      legacy = true;
      await page.goto(url); await ready(page);
      await page.goto(url + 'index.html');
      await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
      assert.ok(await page.evaluate(() => caches.has('avengers-arena-v2')));
      legacy = false;
      await page.reload();
      assert.equal(await page.title(), 'Tishaan’s Game Zone');
      await page.evaluate(() => navigator.serviceWorker.getRegistration().then(registration => registration.update()));
      await page.waitForFunction(async () => !(await caches.has('avengers-arena-v2')) && (await caches.keys()).some(key => key.startsWith('tishaan-game-zone-')));
      await page.context().setOffline(true); await page.reload();
      assert.equal(await page.title(), 'Tishaan’s Game Zone');
      assert.equal(await page.locator('.game-card').count(), 1);
      console.log('PASS migration: existing root Avengers installation upgrades to the hub and loads offline.');
    } finally { legacy = false; await browser.close(); }
    const browserNoJS = await chromium.launch(options);
    try {
      const page = await browserNoJS.newPage({ javaScriptEnabled: false });
      await page.goto(url);
      const link = page.getByRole('link', { name: 'Play Avengers Arena', exact: true });
      assert.ok(await link.isVisible()); await link.click();
      assert.ok(page.url().endsWith('/games/avengers-arena/'));
      console.log('PASS static landing: game names, artwork, and navigation work without hub JavaScript.');
    } finally { await browserNoJS.close(); }
  }
} finally { server.close(); }
