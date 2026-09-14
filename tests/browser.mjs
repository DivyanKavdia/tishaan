import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile, mkdir } from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, 'test-results');
await mkdir(output, { recursive: true });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const server = http.createServer(async (request, response) => {
  const filename = new URL(request.url, 'http://localhost').pathname.replace(/^\//, '') || 'index.html';
  try {
    const content = await readFile(path.join(root, 'dist', filename));
    response.writeHead(200, { 'Content-Type': types[path.extname(filename)] || 'text/plain', 'Cache-Control': 'no-cache' });
    response.end(content);
  } catch { response.writeHead(404); response.end('Not found'); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const url = `http://127.0.0.1:${server.address().port}`;
const launchOptions = {
  headless: true,
  ...(process.env.ARENA_CHROMIUM_EXECUTABLE ? { executablePath: process.env.ARENA_CHROMIUM_EXECUTABLE } : {}),
  ...(process.env.ARENA_SINGLE_PROCESS ? { args: ['--no-sandbox', '--no-zygote', '--single-process', '--disable-dev-shm-usage'] } : {}),
};

async function layoutFits(page, name) {
  const bounds = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth, height: innerHeight, scrollHeight: document.documentElement.scrollHeight }));
  assert.ok(bounds.scrollWidth <= bounds.width, `${name}: horizontal overflow`);
  if (await page.locator('body').evaluate(el => el.classList.contains('is-playing'))) {
    for (const button of await page.locator('[data-input]').all()) {
      const rect = await button.boundingBox();
      assert.ok(rect.x >= 0 && rect.y >= 0 && rect.x + rect.width <= bounds.width + 1 && rect.y + rect.height <= bounds.height + 1, `${name}: touch control outside the viewport`);
    }
  }
}

let completed = 0;
try {
  for (const [name, width, height, mobile] of [['phone', 390, 844, true], ['small-phone', 320, 568, true], ['landscape', 844, 390, true], ['desktop', 1440, 1000, false]]) {
    if (process.env.ARENA_BROWSER_PROFILE && process.env.ARENA_BROWSER_PROFILE !== name) continue;
    const browser = await chromium.launch(launchOptions);
    try {
      const context = await browser.newContext({ viewport: { width, height }, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: 1 });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(url);
      await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
      await page.clock.install();
      await page.clock.runFor(100);
      await layoutFits(page, name);
      await page.screenshot({ path: path.join(output, `${name}-menu.png`), fullPage: true });
      for (const hero of ['Hulk', 'Thor', 'Captain America', 'Iron Man']) {
        await page.locator('.hero-card').filter({ has: page.locator('.card-name', { hasText: hero }) }).click();
        assert.equal(await page.locator('#hero-name').textContent(), hero);
      }
      await page.locator('#opponent').selectOption('hulk');
      await page.locator('#difficulty').selectOption('recruit');
      await page.getByRole('button', { name: 'ENTER THE ARENA' }).click();
      await page.clock.runFor(3400);
      await layoutFits(page, name);
      if (mobile) {
        const session = await context.newCDPSession(page);
        const center = async (selector, id) => {
          const rect = await page.locator(selector).boundingBox();
          return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2, id };
        };
        await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [await center('[data-input="right"]', 1), await center('[data-input="attack"]', 2)] });
        await page.clock.runFor(1600);
        assert.ok(Number(await page.locator('#enemy-health').getAttribute('aria-valuenow')) < 135, `${name}: simultaneous movement and strike did not damage opponent`);
        await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        assert.equal(await page.locator('.touch-button.pressed').count(), 0);
        await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [await center('[data-input="special"]', 3)] });
        await page.clock.runFor(120);
        await session.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
        assert.equal(await page.locator('.touch-button.pressed').count(), 0);
        await page.clock.runFor(500);
        assert.ok(parseFloat(await page.locator('#player-energy-fill').evaluate(el => el.style.width)) < 100, `${name}: special did not consume energy`);
      } else {
        await page.keyboard.down('ArrowRight'); await page.keyboard.down('KeyJ');
        await page.clock.runFor(1800);
        await page.keyboard.up('ArrowRight'); await page.keyboard.up('KeyJ');
        assert.ok(Number(await page.locator('#enemy-health').getAttribute('aria-valuenow')) < 135);
      }
      await page.screenshot({ path: path.join(output, `${name}-fight.png`), fullPage: true });
      await page.getByRole('button', { name: 'Pause game' }).click();
      const time = await page.locator('#timer').textContent();
      await page.clock.runFor(5000);
      assert.equal(await page.locator('#timer').textContent(), time, `${name}: time advanced while paused`);
      await page.getByRole('button', { name: 'BACK TO BATTLE' }).click();
      await page.clock.runFor(1100);
      assert.notEqual(await page.locator('#timer').textContent(), time);
      await page.evaluate(() => window.dispatchEvent(new Event('blur')));
      assert.ok(await page.locator('#pause-overlay').isVisible(), `${name}: did not pause after app lost focus`);
      await page.getByRole('button', { name: 'BACK TO BATTLE' }).click();
      await page.getByRole('button', { name: 'Enable sound' }).click();
      assert.equal(await page.locator('#sound-button').getAttribute('aria-pressed'), 'true');
      await page.getByRole('button', { name: 'Mute sound' }).click();
      await page.getByRole('button', { name: 'How to play' }).click();
      assert.ok(await page.locator('#help-dialog').isVisible());
      await page.getByRole('button', { name: 'GOT IT. LET’S GO.' }).click();
      await page.getByRole('button', { name: 'Change fighter', exact: true }).click();
      assert.ok(await page.locator('#select-screen').isVisible());
      if (name === 'phone') {
        await page.reload();
        await context.setOffline(true);
        await page.reload();
        await page.getByRole('button', { name: 'ENTER THE ARENA' }).click();
        await page.clock.runFor(4000);
        assert.ok(await page.locator('#game-screen').isVisible());
        await context.setOffline(false);
      }
      if (name === 'phone' || name === 'small-phone') {
        if (name === 'small-phone') await page.getByRole('button', { name: 'ENTER THE ARENA' }).click();
        // Exercise an entire timed round through the real render loop.
        await page.clock.runFor(78000);
        assert.ok(await page.locator('#result-overlay').isVisible());
        const surface = await page.locator('#game-surface').boundingBox();
        for (const selector of ['#rematch-button', '#change-button']) {
          const button = await page.locator(selector).boundingBox();
          assert.ok(button.y >= surface.y && button.y + button.height <= surface.y + surface.height, `${name}: result action clipped by arena`);
        }
        await page.getByRole('button', { name: 'REMATCH', exact: true }).click();
        assert.equal(await page.locator('#timer').textContent(), '75');
        assert.ok(await page.locator('#result-overlay').isHidden());
      }
      assert.deepEqual(errors, [], `${name}: browser errors`);
      completed++;
      console.log(`PASS ${name}: selection, combat, controls, sound, pause/resume, instructions${name === 'phone' ? ', offline' : ''}${['phone', 'small-phone'].includes(name) ? ', full round, rematch' : ''}`);
    } finally { await browser.close(); }
  }
  console.log(`${completed} browser profiles passed.`);
} finally { server.close(); }
