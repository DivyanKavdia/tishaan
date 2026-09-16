import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile,mkdir,stat} from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');
const project=fileURLToPath(new URL('../',import.meta.url)),root=process.env.ARENA_SOURCE_SITE?project:path.join(project,'dist'),output=path.join(project,'test-results');await mkdir(output,{recursive:true});
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.png':'image/png','.webmanifest':'application/manifest+json'};
const server=http.createServer(async(req,res)=>{
  try{let file=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(!file.startsWith('/tishaan/'))throw Error();file=path.resolve(root,file.slice(9));if(!file.startsWith(root+path.sep)&&file!==root)throw Error();if((await stat(file)).isDirectory())file=path.join(file,'index.html');res.writeHead(200,{'Content-Type':types[path.extname(file)]||'text/plain'});res.end(await readFile(file));}catch{res.writeHead(404);res.end('Not found');}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base=`http://127.0.0.1:${server.address().port}/tishaan/`;
const options={headless:true,...(process.env.ARENA_CHROMIUM_EXECUTABLE?{executablePath:process.env.ARENA_CHROMIUM_EXECUTABLE}:{}),...(process.env.ARENA_SINGLE_PROCESS?{args:['--no-sandbox','--no-zygote','--single-process','--disable-dev-shm-usage']}:{} )};
const profiles=[['desktop',1440,1000,false],['phone',390,844,true],['small-phone',320,568,true],['landscape',844,390,true]];
try{
  for(const [name,width,height,mobile] of profiles){
    if(process.env.CITADEL_BROWSER_PROFILE&&process.env.CITADEL_BROWSER_PROFILE!==name)continue;
    const browser=await chromium.launch(options);
    try{
      const context=await browser.newContext({viewport:{width,height},isMobile:mobile,hasTouch:mobile});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.clock.install();
      await page.goto(base);await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
      await page.locator('#game-search').fill('iron citadel');assert.equal(await page.locator('.game-card:visible').count(),1);
      await page.getByRole('link',{name:'Play Iron Citadel',exact:true}).click();assert.match(await page.title(),/Iron Citadel/);
      await page.waitForFunction(async()=>{const r=await navigator.serviceWorker.getRegistration(location.href);return r?.active?.state==='activated'&&r.scope===new URL('./',location.href).href;});
      await page.waitForTimeout(150);await page.screenshot({path:path.join(output,`citadel-${name}-menu.png`)});
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      await page.locator('#start').click();await page.waitForFunction(()=>document.querySelector('#game').dataset.phase==='playing');
      await page.clock.runFor(100);
      if(mobile){
        for(const selector of ['#joystick','#fire','#interact','#pause','#reload','#weapon']){const b=await page.locator(selector).boundingBox();assert.ok(b&&b.x>=0&&b.y>=0&&b.x+b.width<=width+1&&b.y+b.height<=height+1,`${name}: ${selector} outside viewport`);}
        const session=await context.newCDPSession(page),fire=await page.locator('#fire').boundingBox(),stick=await page.locator('#joystick').boundingBox();
        const center=(b,id)=>({x:b.x+b.width/2,y:b.y+b.height/2,id});
        await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[center(fire,1),center(stick,2)]});
        await page.clock.runFor(700);assert.ok(Number(await page.locator('#score').textContent())>=200,'Touch shooting did not hit the visible sentry');
        await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[center(fire,1),{...center(stick,2),y:stick.y+8}]});await page.clock.runFor(220);
        assert.notEqual(await page.locator('#stick').evaluate(e=>e.style.transform),'');
        await session.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
        assert.equal(await page.locator('#stick').evaluate(e=>e.style.transform),'');assert.ok(!(await page.locator('#fire').evaluate(e=>e.classList.contains('pressed'))));
        const zone=await page.locator('#look-zone').boundingBox();const look={x:zone.x+zone.width*.3,y:zone.y+zone.height*.3,id:3};
        const before=await page.locator('#scene').evaluate(c=>c.toDataURL());
        await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[look]});await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...look,x:look.x+45}]});await page.clock.runFor(100);await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert.notEqual(await page.locator('#scene').evaluate(c=>c.toDataURL()),before,'Drag did not change the view');
      }else{
        await page.keyboard.down('Space');await page.clock.runFor(700);await page.keyboard.up('Space');assert.ok(Number(await page.locator('#score').textContent())>=200,'Keyboard shooting did not defeat the sentry');
        const before=await page.locator('#scene').evaluate(c=>c.toDataURL());await page.keyboard.down('KeyW');await page.clock.runFor(220);await page.keyboard.up('KeyW');assert.notEqual(await page.locator('#scene').evaluate(c=>c.toDataURL()),before,'W did not move');
      }
      await page.locator('#reload').click();await page.clock.runFor(1200);assert.match(await page.locator('#ammo').textContent(),/^12/);
      await page.locator('#weapon').click();await page.clock.runFor(100);assert.match(await page.locator('#weapon-name').textContent(),/SHOCK/);
      await page.locator('#weapon').click();await page.clock.runFor(100);assert.match(await page.locator('#weapon-name').textContent(),/SIDEARM/);
      await page.locator('#map-button').click();assert.equal(await page.locator('#map-button').getAttribute('aria-pressed'),'true');await page.locator('#map-button').click();
      await page.screenshot({path:path.join(output,`citadel-${name}-play.png`)});
      await page.locator('#pause').click();assert.ok(await page.locator('#dialog').isVisible());const health=await page.locator('#health').textContent();await page.clock.runFor(4000);assert.equal(await page.locator('#health').textContent(),health);
      await page.locator('#continue').click();await page.clock.runFor(100);await page.evaluate(()=>window.dispatchEvent(new Event('blur')));assert.ok(await page.locator('#dialog').isVisible(),'Losing focus did not pause');
      await page.locator('#restart').click();await page.clock.runFor(100);assert.equal(await page.locator('#score').textContent(),'00000');assert.equal(await page.locator('#health').textContent(),'100');
      await page.locator('#pause').click();await page.locator('#menu-button').click();await page.clock.runFor(100);assert.ok(await page.locator('#menu').isVisible());
      if(name==='phone'){
        await page.clock.resume();await context.setOffline(true);await page.reload();await page.locator('#start').click();await page.waitForFunction(()=>document.querySelector('#game').dataset.phase==='playing');
        await page.getByRole('link',{name:'Back to Tishaan’s Game Zone'}).click();assert.match(await page.title(),/^Tishaan’s Game Zone/);
        await page.getByRole('link',{name:'Play Iron Citadel',exact:true}).click();assert.ok(await page.locator('#start').isVisible());await context.setOffline(false);
      }
      await page.getByRole('link',{name:'Back to Tishaan’s Game Zone'}).click();assert.match(await page.title(),/^Tishaan’s Game Zone/);assert.deepEqual(errors,[]);
      console.log(`PASS Iron Citadel ${name}: hub launch, layout, combat, movement, reload, weapons, map, pause, retry, return${name==='phone'?', offline round trip':''}`);
    }finally{await browser.close();}
  }
}finally{server.close();}
