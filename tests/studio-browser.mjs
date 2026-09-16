import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');
const root=path.resolve(fileURLToPath(new URL('../dist/',import.meta.url))),output=fileURLToPath(new URL('../test-results/studio/',import.meta.url));fs.mkdirSync(output,{recursive:true});
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png'};
const options={headless:true,...(process.env.ARENA_CHROMIUM_EXECUTABLE?{executablePath:process.env.ARENA_CHROMIUM_EXECUTABLE}:{}),...(process.env.ARENA_SINGLE_PROCESS?{args:['--no-sandbox','--no-zygote','--single-process','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}:{} )};
const catalog=JSON.parse(fs.readFileSync(path.join(root,'games/catalog.json'))),base='http://localhost/tishaan/';
const launchers={'avengers-arena':'#start-button','candy-pop':'#modal-primary','iron-citadel':'#start','monterra':'#start-btn'};
let count=0;const results=[];
for(const [profile,width,height] of [['desktop',1440,960],['phone',390,844],['small-phone',320,568],['landscape',844,390]]){
 if(process.env.STUDIO_PROFILE&&process.env.STUDIO_PROFILE!==profile)continue;
 if(process.env.STUDIO_SKIP_PROFILE===profile)continue;
 const browser=await chromium.launch(options);
 // Route requests from the built files: no development server or network needed.
 const context=await browser.newContext({viewport:{width,height},hasTouch:profile!=='desktop',isMobile:profile!=='desktop',deviceScaleFactor:1,serviceWorkers:'block',reducedMotion:'reduce'});
 await context.route('**/*',async route=>{try{const u=new URL(route.request().url());let f=path.resolve(root,u.pathname.replace(/^\/tishaan\//,''));if(!f.startsWith(root))throw Error('outside root');if(fs.statSync(f).isDirectory())f=path.join(f,'index.html');await route.fulfill({body:fs.readFileSync(f),contentType:types[path.extname(f)]||'text/plain'});}catch{await route.fulfill({status:404,body:'Not found'});}});
 const page=await context.newPage();page.setDefaultTimeout(15000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(base);await page.waitForFunction(()=>!document.querySelector('#library-tools').hidden);
  assert.equal(await page.locator('.game-card').count(),9);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Hub overflow');
  await page.locator('#game-search').fill('tower');assert.equal(await page.locator('.game-card:visible').count(),1);
  await page.locator('#game-search').fill('no such game');assert.ok(await page.locator('#empty-state').isVisible());
  await page.locator('#clear-search').click();await page.locator('[data-category="Shooter"]').click();assert.equal(await page.locator('.game-card:visible').count(),2);
  await page.locator('[data-category="All"]').click();await page.screenshot({path:path.join(output,`hub-${profile}.png`),fullPage:true});
  for(const game of catalog){
   if(process.env.STUDIO_GAME&&game.slug!==process.env.STUDIO_GAME)continue;
   await page.goto(base);await page.getByRole('link',{name:`Play ${game.name}`,exact:true}).click();
   await page.waitForTimeout(300);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${game.slug} menu overflow ${profile}`);
   if(profile==='phone')await page.screenshot({path:path.join(output,`${game.slug}-menu.png`),fullPage:true});
   await page.locator(launchers[game.slug]||'#launch').click();
   await page.waitForTimeout(game.slug==='avengers-arena'?3400:850);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${game.slug} play overflow ${profile}`);
   if(await page.evaluate(()=>!!window.__STUDIO_TEST__)){
    assert.equal(await page.evaluate(()=>__STUDIO_TEST__.snapshot().mode),'playing',game.slug);
    for(const selector of ['#pause','[data-action="primary"]','[data-action="special"]','[data-action="aux"]']){
     const b=await page.locator(selector).boundingBox();assert.ok(b&&b.x>=0&&b.y>=0&&b.x+b.width<=width+1&&b.y+b.height<=height+1,`${game.slug} ${profile} ${selector} clipped ${JSON.stringify(b)}`);
    }
    await page.keyboard.down('KeyD');await page.keyboard.down('KeyJ');await page.waitForTimeout(250);await page.keyboard.up('KeyD');await page.keyboard.up('KeyJ');
    await page.locator('#pause').click();const before=await page.evaluate(()=>JSON.stringify(__STUDIO_TEST__.snapshot().state));await page.waitForTimeout(200);assert.equal(await page.evaluate(()=>JSON.stringify(__STUDIO_TEST__.snapshot().state)),before,'Pause froze state');
    await page.locator('#continue').click();
    await page.locator('[data-action="primary"]').dispatchEvent('pointerdown',{pointerId:1,clientX:100,clientY:100});await page.locator('[data-action="primary"]').dispatchEvent('pointercancel',{pointerId:1});
    assert.equal(await page.evaluate(()=>__STUDIO_TEST__.studio.actions.size),0,'cancel released button');
    if(profile==='phone'){
     await page.evaluate(()=>__STUDIO_TEST__.win());assert.equal(await page.evaluate(()=>__STUDIO_TEST__.snapshot().progress.unlocked),1);
     await page.locator('#continue').click();assert.equal(await page.evaluate(()=>__STUDIO_TEST__.snapshot().level),1);
     await page.locator('#pause').click();await page.locator('#return-menu').click();await page.reload();assert.equal(await page.evaluate(()=>__STUDIO_TEST__.snapshot().progress.unlocked),1,'Progress survives reload');await page.locator('#launch').click();
    }
   }
   if(game.slug==='iron-citadel'&&profile!=='desktop')for(const selector of ['#fire','#joystick','#interact'])assert.ok(await page.locator(selector).isVisible(),selector+' visible');
   if(game.slug==='monterra'&&profile==='small-phone'){
     await page.evaluate(()=>__WILDS_TEST__.encounter(1,3));await page.waitForTimeout(700);
     for(const selector of ['#guard-btn','#switch-btn','#heal-btn']){const b=await page.locator(selector).boundingBox();assert.ok(b&&b.y>=0&&b.y+b.height<=height+1,selector+' fits');}
     await page.screenshot({path:path.join(output,'monterra-battle-small.png')});
   }
   await page.screenshot({path:path.join(output,`${game.slug}-${profile}.png`)});
   const back=page.locator('a[href="../../"]').first();await back.click();assert.equal(new URL(page.url()).pathname,'/tishaan/');
   assert.deepEqual(errors,[],`${game.slug} ${profile}: browser errors`);count++;results.push({game:game.slug,profile,result:'pass'});console.log(`PASS ${game.slug} ${profile}: launch, rendering, layout, controls and return`);
  }
 }catch(error){await page.screenshot({path:path.join(output,`failure-${profile}.png`),fullPage:true}).catch(()=>{});console.log('PAGE ERRORS',errors);throw error;}finally{await browser.close();}
}
fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(results,null,2));console.log(`${count} game/profile checks passed.`);
