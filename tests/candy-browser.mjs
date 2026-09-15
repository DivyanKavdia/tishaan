import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile, mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { CandyGame, availableMoves, validSwap } from '../games/candy-pop/engine.js';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
const root = path.resolve(fileURLToPath(new URL('../dist/', import.meta.url)));
const output = fileURLToPath(new URL('../test-results/', import.meta.url));
await mkdir(output, { recursive: true });
const types = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.svg':'image/svg+xml', '.png':'image/png', '.json':'application/json', '.webmanifest':'application/manifest+json' };
const server = http.createServer(async (req,res) => {
  try {
    const relative = decodeURIComponent(new URL(req.url,'http://local').pathname).replace(/^\/tishaan\//,'');
    let file = path.resolve(root,relative);
    if (file !== root && !file.startsWith(root + path.sep)) throw new Error('Outside root');
    if ((await stat(file)).isDirectory()) file = path.join(file,'index.html');
    res.writeHead(200, { 'Content-Type':types[path.extname(file)] || 'text/plain', 'Cache-Control':'no-store' }); res.end(await readFile(file));
  } catch { res.writeHead(404); res.end(); }
});
await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
const base = `http://127.0.0.1:${server.address().port}/tishaan/`, url = base + 'games/candy-pop/';
const launchOptions = { headless:true, ...(process.env.ARENA_CHROMIUM_EXECUTABLE ? { executablePath:process.env.ARENA_CHROMIUM_EXECUTABLE } : {}), ...(process.env.ARENA_SINGLE_PROCESS ? { args:['--no-sandbox','--no-zygote','--single-process','--disable-dev-shm-usage'] } : {}) };
let browser = await chromium.launch(launchOptions);
const rng = seed => () => { seed = (Math.imul(seed,1664525) + 1013904223) >>> 0; return seed / 4294967296; };
const state = page => page.evaluate(() => JSON.parse(localStorage.getItem('tishaan-candy-pop-v1')));
const idle = page => page.waitForFunction(() => !document.getElementById('hint').disabled);
const begin = async page => { await page.locator('#modal-primary').click(); await page.waitForFunction(() => !document.getElementById('modal').open); };
async function loadGame(page, game, unlocked = game.level) {
  // Install after pagehide has saved the outgoing board, and consume only once.
  await page.addInitScript(() => { const data = sessionStorage.getItem('candy-test-fixture'); if (data) { localStorage.setItem('tishaan-candy-pop-v1',data); sessionStorage.removeItem('candy-test-fixture'); } });
  await page.evaluate(({ active, unlocked }) => sessionStorage.setItem('candy-test-fixture',JSON.stringify({ unlocked, stars:{}, best:{}, sound:false, active })), { active:game.snapshot(), unlocked });
  await page.reload(); await begin(page);
}
async function touchSwap(page,a,b) {
  const center = async i => { const r = await page.locator(`[data-index="${i}"]`).boundingBox(); return { x:r.x+r.width/2,y:r.y+r.height/2 }; };
  const from=await center(a),to=await center(b),cdp=await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...from,id:1}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...to,id:1}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await cdp.detach(); await idle(page);
}

try {
  for (const [name,width,height,mobile] of [['phone',390,844,true],['small-phone',320,568,true],['landscape',844,390,true],['desktop',1440,1000,false]]) {
    const context = await browser.newContext({viewport:{width,height},isMobile:mobile,hasTouch:mobile,reducedMotion:'reduce'});
    await context.addInitScript(() => { let seed = 731; Math.random = () => { seed = (Math.imul(seed,1664525) + 1013904223) >>> 0; return seed / 4294967296; }; });
    const page=await context.newPage(),errors=[];
    page.setDefaultTimeout(15000);
    page.on('pageerror',e=>{ errors.push(e.message); console.error(e.message); });
    await page.goto(base);
    await page.getByRole('link',{name:'Play Candy Pop',exact:true}).click();
    assert.equal(page.url(),url);
    await begin(page);
    await loadGame(page,new CandyGame(0,rng(8)));
    assert.equal(await page.locator('.cell').count(),64);
    const bounds=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:innerWidth}));
    assert.ok(bounds.scroll<=bounds.width,`${name}: horizontal overflow`);
    for (const selector of ['#board','#hint','#hammer','#shuffle']) {
      const r=await page.locator(selector).boundingBox();
      assert.ok(r.x>=0&&r.x+r.width<=width+1&&r.y>=0&&r.y+r.height<=height+1,`${name}: ${selector} must fit the screen`);
    }
    await page.screenshot({path:path.join(output,`candy-${name}.png`),fullPage:true});
    let saved=await state(page),move=availableMoves(saved.active.board)[0];
    if(mobile) await touchSwap(page,...move);
    else { await page.locator(`[data-index="${move[0]}"]`).click(); await page.locator(`[data-index="${move[1]}"]`).click(); await idle(page); }
    saved=await state(page);
    assert.equal(saved.active.moves,24); assert.ok(saved.active.score>0);
    await page.locator('#hint').click(); assert.equal(await page.locator('.cell.hint').count(),2);
    const beforeHint=await state(page); assert.equal(beforeHint.active.moves,24);
    const invalid=Array.from({length:63},(_,i)=>[i,i+1]).find(([a,b])=>a%8<7&&!validSwap(saved.active.board,a,b));
    await page.locator(`[data-index="${invalid[0]}"]`).click(); await page.locator(`[data-index="${invalid[1]}"]`).click(); await idle(page);
    assert.deepEqual((await state(page)).active,saved.active);
    await page.locator('#hammer').click(); await page.locator('[data-index="10"]').click(); await idle(page);
    assert.equal((await state(page)).active.boosters.hammer,1);
    assert.equal((await state(page)).active.moves,24);
    await page.locator('#shuffle').click(); await idle(page);
    assert.equal((await state(page)).active.boosters.shuffle,1);
    const beforeReload=(await state(page)).active;
    await page.reload(); assert.match(await page.locator('#modal-title').textContent(),/Welcome back/); await begin(page);
    assert.deepEqual((await state(page)).active,beforeReload);
    await page.locator('#help').click(); assert.match(await page.locator('#modal-content').textContent(),/pink jelly/); await page.locator('#modal-primary').click();
    await page.locator('#map').click(); assert.equal(await page.locator('.level-choice').count(),24); assert.equal(await page.locator('.level-choice:disabled').count(),23); await page.locator('#modal-close').click();
    await page.locator('#restart').click(); await page.locator('#modal-secondary').click(); assert.deepEqual((await state(page)).active,beforeReload);
    if(name==='phone') {
      await page.waitForFunction(async()=>{const r=await navigator.serviceWorker.getRegistration(location.href);return r?.scope.endsWith('/games/candy-pop/')&&r.active?.state==='activated';});
      await context.setOffline(true); await page.reload(); await begin(page);
      assert.deepEqual((await state(page)).active,beforeReload);
      await page.getByRole('link',{name:'Back to Tishaan’s Game Zone'}).click(); assert.equal(await page.title(),'Tishaan’s Game Zone');
      await page.getByRole('link',{name:'Play Candy Pop',exact:true}).click(); await begin(page);
      assert.deepEqual((await state(page)).active,beforeReload);
      assert.ok(await page.evaluate(async()=>{const c=await caches.keys();return c.some(k=>k.startsWith('tishaan-game-zone-'))&&c.some(k=>k.startsWith('tishaan-candy-pop-'));}));
      await context.setOffline(false);
      console.log('PASS candy offline: hub round trip, cached board assets, and saved progress');
    }
    await page.getByRole('link',{name:'Back to Tishaan’s Game Zone'}).click(); assert.equal(page.url(),base);
    assert.deepEqual(errors,[]);
    console.log(`PASS candy ${name}: layout, real ${mobile?'touch swipe':'mouse swap'}, invalid swap, hints, boosters, resume, help, map, restart cancellation, hub navigation`);
    await context.close();
    await browser.close(); browser = await chromium.launch(launchOptions);
  }
  const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'}),page=await context.newPage();
  page.setDefaultTimeout(15000);
  await page.goto(url); await begin(page);
  const win = new CandyGame(0,rng(8)); win.score=win.rules.target-40; win.moves=1;
  await loadGame(page,win);
  const [a,b]=availableMoves(win.board)[0];
  await page.locator(`[data-index="${a}"]`).focus(); await page.keyboard.press('Space');
  await page.locator(`[data-index="${b}"]`).focus(); await page.keyboard.press('Enter');
  await page.waitForFunction(()=>document.getElementById('modal').open);
  assert.match(await page.locator('#modal-kicker').textContent(),/LEVEL 1 COMPLETE/);
  assert.equal((await state(page)).unlocked,1);
  await page.locator('#modal-primary').click(); assert.equal(await page.locator('#level-number').textContent(),'2');
  const lose=new CandyGame(23,rng(8)); lose.moves=1;
  await loadGame(page,lose);
  const pair=availableMoves(lose.board)[0];
  await page.locator(`[data-index="${pair[0]}"]`).click(); await page.locator(`[data-index="${pair[1]}"]`).click();
  await page.waitForFunction(()=>document.getElementById('modal').open);
  assert.equal(await page.locator('#modal-kicker').textContent(),'OUT OF MOVES');
  await page.locator('#modal-primary').click(); assert.equal(Number(await page.locator('#moves').textContent()),lose.rules.moves);
  await page.evaluate(()=>sessionStorage.setItem('candy-test-fixture','{broken-json'));
  await page.reload(); await begin(page); assert.equal(await page.locator('.cell').count(),64);
  console.log('PASS candy endings: keyboard swap, final-move victory, level unlock, next level, loss, retry, corrupt storage recovery');
  await context.close();
  await browser.close(); browser = await chromium.launch(launchOptions);
  const noStorage=await browser.newContext();
  await noStorage.addInitScript(()=>{Storage.prototype.getItem=Storage.prototype.setItem=()=>{throw new Error('Storage disabled');};});
  const privatePage=await noStorage.newPage(); await privatePage.goto(url); await begin(privatePage);
  await privatePage.locator('#hint').click(); assert.equal(await privatePage.locator('.hint').count(),2);
  console.log('PASS candy without storage: game and controls still work');
  await noStorage.close();
} finally { await browser.close(); server.close(); }
