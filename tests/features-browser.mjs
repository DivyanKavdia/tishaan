import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');
const root=path.resolve(fileURLToPath(new URL('../dist/',import.meta.url))),output=fileURLToPath(new URL('../test-results/features/',import.meta.url));
fs.mkdirSync(output,{recursive:true});
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png'};
const browser=await chromium.launch({headless:true,...(process.env.ARENA_CHROMIUM_EXECUTABLE?{executablePath:process.env.ARENA_CHROMIUM_EXECUTABLE}:{}),args:['--no-sandbox','--no-zygote','--single-process','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1,serviceWorkers:'block',reducedMotion:'reduce'});
await context.route('**/*',async route=>{
  try{const url=new URL(route.request().url());let file=path.resolve(root,url.pathname.replace(/^\/tishaan\//,''));if(!file.startsWith(root))throw Error('outside site');if(fs.statSync(file).isDirectory())file=path.join(file,'index.html');await route.fulfill({body:fs.readFileSync(file),contentType:types[path.extname(file)]||'text/plain'});}
  catch{await route.fulfill({status:404,body:'Not found'});}
});
const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(20000);
const base='http://localhost/tishaan/';
let count=0;
function pass(message){count++;console.log('PASS '+message);}
async function open(slug){await page.goto(base+'games/'+slug+'/');}
try{
  await page.goto(base);await page.waitForFunction(()=>!document.getElementById('library-tools').hidden);
  await page.getByRole('button',{name:'Favorite Candy Pop',exact:true}).click();await page.locator('#favorites-filter').click();
  assert.equal(await page.locator('.game-card:visible').count(),1);await page.reload();await page.waitForFunction(()=>!document.getElementById('library-tools').hidden);
  assert.equal(await page.getByRole('button',{name:'Unfavorite Candy Pop'}).getAttribute('aria-pressed'),'true');pass('Favorites persist and filter the real catalog');

  await open('world-strike');await page.locator('.play-settings summary').click();await page.locator('#left-handed').check();await page.locator('#launch').click();
  await page.waitForFunction(()=>window.__STUDIO_TEST__?.snapshot().mode==='playing');
  const joy=await page.locator('#joystick').boundingBox(),fire=await page.locator('[data-action=primary]').boundingBox();assert.ok(joy.x>fire.x,'left-handed layout reverses controls');
  const hud=await page.locator('.mission-hud').boundingBox(),goals=await page.locator('#mastery-track').boundingBox();assert.ok(goals.y>=hud.y+hud.height,'skill goals do not obscure HUD labels');
  await page.evaluate(()=>{const g=__STUDIO_TEST__.studio.game;g.enemies=[{x:2,z:7,hp:500,max:500,type:'guard',cd:99,stun:0,flash:0,charge:0}];});
  const cdp=await context.newCDPSession(page),j={x:joy.x+joy.width*.7,y:joy.y+joy.height*.5,id:1},f={x:fire.x+fire.width*.5,y:fire.y+fire.height*.5,id:2};
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[j,f]});await page.waitForTimeout(350);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  const state=await page.evaluate(()=>__STUDIO_TEST__.snapshot());assert.ok(state.state.player.x>0);assert.ok(state.state.ammo<30);assert.equal(await page.evaluate(()=>__STUDIO_TEST__.studio.actions.size),0);pass('Left-handed controls support simultaneous movement and fire with clean touch release');
  await page.evaluate(()=>{const g=__STUDIO_TEST__.studio.game;g.reload=0;g.ammo=1;g.action('aux');g.reload=g.weapon.reload*.48;});
  await page.locator('[data-action=aux]').click();assert.equal(await page.evaluate(()=>__STUDIO_TEST__.studio.game.perfectReloads),1);pass('Reload button activates the precision window');
  // Emulate a standard controller without opening host hardware devices.
  await page.evaluate(()=>{window.testPad={connected:true,mapping:'standard',axes:[.8,0],buttons:Array.from({length:16},()=>({pressed:false}))};Object.defineProperty(navigator,'getGamepads',{value:()=>[window.testPad],configurable:true});__STUDIO_TEST__.studio.gamepadConnected=true;});
  const x=await page.evaluate(()=>__STUDIO_TEST__.studio.game.player.x);await page.waitForTimeout(200);assert.ok(await page.evaluate(()=>__STUDIO_TEST__.studio.game.player.x)>x);
  await page.evaluate(()=>window.testPad.buttons[9].pressed=true);await page.waitForFunction(()=>__STUDIO_TEST__.snapshot().mode==='paused');
  await page.evaluate(()=>{window.testPad.buttons[9].pressed=false;});await page.waitForTimeout(100);await page.evaluate(()=>window.testPad.buttons[9].pressed=true);await page.waitForFunction(()=>__STUDIO_TEST__.snapshot().mode==='playing');
  await page.evaluate(()=>{__STUDIO_TEST__.studio.gamepadConnected=false;window.testPad.buttons[9].pressed=false;});pass('Emulated controller moves, pauses and resumes without repeated button triggers');
  await page.evaluate(()=>__STUDIO_TEST__.win());assert.ok((await page.locator('#result-skills').textContent()).includes('Perfect reloads'));await page.locator('#return-menu').click();await page.reload();
  assert.ok(await page.locator('#left-handed').isChecked());await page.goto(base);await page.waitForFunction(()=>document.getElementById('player-stats').textContent.includes('1 stages cleared'));pass('Results and comfort preferences survive reload and appear in the hub');

  await open('candy-pop');await page.locator('#modal-primary').click();
  const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('tishaan-candy-pop-v1')).active);
  await page.locator('#hint').click();const cells=await page.locator('.cell.hint').evaluateAll(items=>items.map(el=>Number(el.dataset.index)));assert.equal(cells.length,2);
  await page.locator(`.cell[data-index="${cells[0]}"]`).tap();await page.locator(`.cell[data-index="${cells[1]}"]`).tap();await page.waitForFunction(()=>!document.getElementById('undo').disabled);
  await page.locator('#undo').click();const restored=await page.evaluate(()=>JSON.parse(localStorage.getItem('tishaan-candy-pop-v1')).active);assert.deepEqual(restored.board,before.board);assert.equal(restored.moves,before.moves);assert.equal(restored.rewinds,0);
  await page.reload();await page.locator('#modal-primary').click();assert.ok(await page.locator('#undo').isDisabled());pass('Hint, touch swap, undo and saved rewind limit work together');
  await page.screenshot({path:path.join(output,'candy-phone.png')});

  await open('dragon-keep');await page.locator('#launch').click();await page.waitForFunction(()=>__STUDIO_TEST__.studio.renderer.vp);
  const pad=await page.evaluate(()=>{const s=__STUDIO_TEST__.studio,p=s.game.pads[0],v=s.renderer.project([p.x,.1,p.z]),r=document.getElementById('scene').getBoundingClientRect();return {x:r.x+v[0]*r.width,y:r.y+v[1]*r.height};});
  await page.mouse.click(pad.x,pad.y);await page.waitForFunction(()=>__STUDIO_TEST__.studio.game.pads[0].tower);
  await page.locator('[data-tool=target]').click();assert.equal(await page.evaluate(()=>__STUDIO_TEST__.studio.game.pads[0].tower.priority),'strongest');pass('Tapping the 3D battlefield builds a tower and its priority button changes targeting');

  await open('iron-citadel');await page.locator('#start').click();await page.locator('#scan').click();await page.waitForFunction(()=>document.getElementById('scan').disabled);await page.locator('#pause').click();const scan=await page.locator('#scan').textContent();await page.waitForTimeout(400);assert.equal(await page.locator('#scan').textContent(),scan);pass('Recon scan is reachable on a phone and its cooldown pauses');

  await open('monterra');await page.locator('#start-btn').click();await page.evaluate(()=>{__WILDS_TEST__.state().wins=3;__WILDS_TEST__.teleport(174,22);});
  await page.locator('#adventure-btn').click();assert.equal(await page.evaluate(()=>__WILDS_TEST__.snapshot().mode),'field');const position=await page.evaluate(()=>__WILDS_TEST__.snapshot().state.position);
  await page.keyboard.down('w');await page.waitForTimeout(200);await page.keyboard.up('w');assert.deepEqual(await page.evaluate(()=>__WILDS_TEST__.snapshot().state.position),position);
  await page.locator('#rival-action').click();assert.ok((await page.locator('#duel-intent').textContent()).includes('Quick attack'));await page.locator('#duel-strike').click();await page.locator('#duel-exit').click();await page.waitForTimeout(1000);assert.ok(await page.locator('#rival-action').isVisible());
  await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>__WILDS_TEST__.snapshot().mode),'explore');await page.reload();await page.locator('#start-btn').click();assert.deepEqual(await page.evaluate(()=>__WILDS_TEST__.snapshot().state.position),position);
  await page.locator('#minimap').click();pass('Field Guide freezes exploration, abandoned turns stay cancelled, distant saves persist and island radar toggles');
  await page.waitForTimeout(1900);const ecology=await page.locator('#ecology-chip').boundingBox(),interact=await page.locator('#interact-btn').boundingBox();assert.ok(ecology.y+ecology.height<interact.y,'ecology forecast does not obscure interaction controls');await page.screenshot({path:path.join(output,'monterra-phone.png')});
  assert.deepEqual(errors,[]);console.log(`${count} feature flows passed with no browser errors.`);
}catch(error){await page.screenshot({path:path.join(output,'failure.png')}).catch(()=>{});console.log('BROWSER ERRORS',errors);throw error;}
finally{await browser.close();}
