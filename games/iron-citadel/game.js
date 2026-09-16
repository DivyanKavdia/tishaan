import { Game, LEVELS, clamp } from './engine.js';
import { Renderer } from './scene.js';

const $=id=>document.getElementById(id);
const coarse=navigator.maxTouchPoints>0||matchMedia('(pointer:coarse)').matches||innerWidth<=700;
const reducedMotion=matchMedia('(prefers-reduced-motion:reduce)').matches;
let stored={};try{stored=JSON.parse(localStorage.getItem('iron-citadel-v1')||'{}')||{};}catch{}
let best=Math.max(0,Number(stored.best)||0),unlocked=clamp(Number(stored.unlocked)||0,0,LEVELS.length-1),muted=stored.muted===true;
const save=()=>{try{localStorage.setItem('iron-citadel-v1',JSON.stringify({best,unlocked,muted}));}catch{}};
let game=new Game(),checkpoint=null,selectedLevel=0,expandedMap=false,dirty=true,last=performance.now(),uiTime=0,lastPhase='menu',toastTimer;
game.player.a=-.18;
const renderer=new Renderer($('scene'),document.querySelector('.statusbar'));
const keys=new Set(),input={forward:0,strafe:0,turn:0,look:0,fire:false,assist:coarse,sprint:false};
let stickId=null,lookId=null,fireId=null,stickX=0,stickY=0,lookX=0,pointerFire=false;
let audio=null;
const soundPattern={fire:[180,.08,'sawtooth',.055,55],hit:[650,.06,'square',.025,350],kill:[90,.2,'triangle',.11,30],pickup:[620,.15,'sine',.10,1000],door:[110,.3,'sawtooth',.022,60],reload:[250,.06,'square',.025,80],loaded:[450,.07,'triangle',.05,620],hurt:[75,.14,'sawtooth',.05,40],complete:[440,.4,'triangle',.12,880],switch:[220,.06,'sine',.04,400],'enemy-fire':[80,.1,'square',.025,40],start:[260,.23,'triangle',.07,520]};
function unlockAudio(){
  if(muted)return;
  try{audio ||= new (window.AudioContext||window.webkitAudioContext)();audio.resume().catch(()=>{});}catch{}
}
function tone(type){
  if(muted||!audio||audio.state!=='running')return;
  const config=soundPattern[type];if(!config)return;
  try{const [frequency,duration,wave,volume,end]=config,osc=audio.createOscillator(),gain=audio.createGain(),t=audio.currentTime;
    osc.type=wave;osc.frequency.setValueAtTime(frequency,t);osc.frequency.exponentialRampToValueAtTime(end,t+duration);
    gain.gain.setValueAtTime(volume,t);gain.gain.exponentialRampToValueAtTime(.001,t+duration);osc.connect(gain);gain.connect(audio.destination);osc.start(t);osc.stop(t+duration+.02);osc.onended=()=>{osc.disconnect();gain.disconnect();};
  }catch{}
}
function updateMenu(){
  if($('sector').options.length!==LEVELS.length)$('sector').innerHTML=LEVELS.map((l,i)=>`<option value="${i}">${l.name}</option>`).join('');
  $('best').textContent=`BEST ${String(best).padStart(5,'0')}`;
  [...$('sector').options].forEach((option,i)=>{option.disabled=i>unlocked;option.textContent=`0${i+1} / ${LEVELS[i].name}${i>unlocked?' — locked':''}`;});
  $('sound').setAttribute('aria-pressed',String(muted));$('sound').setAttribute('aria-label',muted?'Enable sound':'Mute sound');$('sound').firstChild.textContent=muted?'♫ ':'♪ ';
}
function notify(message,duration=2700){
  clearTimeout(toastTimer);$('toast').textContent=message;$('toast').classList.add('visible');toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),duration);
}
function clearInput(){
  keys.clear();stickId=lookId=fireId=null;stickX=stickY=0;pointerFire=false;input.look=0;input.fire=false;
  $('stick').style.transform='';$('fire').classList.remove('pressed');
}
function releaseMouse(){if(document.pointerLockElement)document.exitPointerLock();}
function rememberCheckpoint(){checkpoint={score:game.score,kills:game.kills,shots:game.shots,hits:game.hits,time:game.time,player:{...game.player}};}
function start(){
  unlockAudio();clearInput();selectedLevel=Number($('sector').value);
  game=new Game(document.querySelector('[name="difficulty"]:checked').value);
  if(selectedLevel>0)game.loadLevel(selectedLevel);
  if(selectedLevel>=2){game.player.rifle=true;game.player.weapon=1;}
  rememberCheckpoint();game.start();dirty=true;
  $('scene').focus({preventScroll:true});
  notify(coarse?'Left stick: move. Drag right: look. Hold FIRE.':'WASD: move · ← →: turn · SPACE: fire · E: open',4500);
}
function restart(){
  const index=game.levelIndex,difficulty=game.difficulty,previous=checkpoint;
  clearInput();$('dialog').close();game=new Game(difficulty);
  Object.assign(game,{score:previous.score,kills:previous.kills,shots:previous.shots,hits:previous.hits,time:previous.time});
  game.player={...previous.player};game.loadLevel(index);game.start();dirty=true;$('scene').focus({preventScroll:true});
}
function pause(){if(game.phase!=='playing')return;game.pause();clearInput();releaseMouse();showDialog();}
function resume(){game.resume();clearInput();$('dialog').close();unlockAudio();$('scene').focus({preventScroll:true});dirty=true;}
function menu(){
  clearInput();$('dialog').close();game=new Game();game.player.a=-.18;dirty=true;releaseMouse();updateMenu();$('start').focus({preventScroll:true});
}
function showDialog(){
  const state=game.phase,pause=state==='paused',dead=state==='dead',won=state==='won';
  $('dialog-kicker').textContent=pause?'MISSION ON HOLD':dead?'OPERATIVE SIGNAL LOST':won?'TRANSMISSION COMPLETE':`SECTOR 0${game.levelIndex+1} SECURED`;
  $('dialog-title').textContent=pause?'TAKE A BREATHER.':dead?'BACK IN THE FIGHT?':won?'CITADEL SILENCED.':'MISSION COMPLETE.';
  $('dialog-text').textContent=pause?'Your mission is paused. Move sideways when a visor flashes to dodge enemy fire.':dead?'The sentries got this round. Your mission checkpoint is ready for another try.':won?'The Warden is down. You made it through the fortress. Nicely done, operative.':`${game.level.spec.name} is behind you. Fresh supplies and a new challenge are waiting.`;
  $('continue').innerHTML=pause?'BACK TO ACTION <span>↗</span>':dead?'TRY AGAIN <span>↗</span>':won?'PLAY AGAIN <span>↗</span>':'NEXT MISSION <span>↗</span>';
  $('restart').hidden=!pause;$('result-stats').hidden=pause;
  const accuracy=game.shots?Math.round(game.hits/game.shots*100):0;
  $('result-stats').innerHTML=`<div><strong>${game.score}</strong><span>SCORE</span></div><div><strong>${game.kills}</strong><span>SENTRIES</span></div><div><strong>${accuracy}%</strong><span>ACCURACY</span></div>`;
  if(!$('dialog').open)$('dialog').showModal();
}
function events(){
  const labels={health:'MEDKIT +40 HEALTH',ammo:'AMMO +30',key:'GOLD KEY ACQUIRED — find the gold EXIT',treasure:'INTEL +500 POINTS',rifle:'REPEATER ACQUIRED — hold FIRE for rapid shots'};
  for(const event of game.events){
    tone(event.type);
    if(event.type==='pickup')notify(labels[event.item]);
    if(event.type==='message')notify(event.text);
    if(event.type==='empty')notify('Out of ammo. Switch to the SHOCK tool or find supplies.');
    if(event.type==='kill'&&event.boss)notify('WARDEN DEFEATED — reach the gold exit!',4000);
    if(event.type==='complete'){
      best=Math.max(best,game.score);unlocked=Math.max(unlocked,Math.min(LEVELS.length-1,game.levelIndex+1));save();clearInput();releaseMouse();showDialog();
    }
    if(event.type==='dead'){clearInput();releaseMouse();showDialog();}
  }
  game.events.length=0;
}
function updateHUD(){
  const p=game.player;
  $('health').textContent=Math.ceil(p.hp);$('health-bar').style.width=`${p.hp}%`;$('health').parentElement.classList.toggle('low',p.hp<30);
  $('ammo').innerHTML=game.reloading?'… <small>LOADING</small>':p.weapon===2?'∞ <small>SHOCK</small>':`${p.ammo} <small>/ ${p.reserve}</small>`;
  $('weapon-name').textContent=['01 / SIDEARM','02 / REPEATER','03 / SHOCK'][p.weapon];$('reload').disabled=p.weapon===2||!!game.reloading||p.ammo===12||!p.reserve;
  $('key').textContent=p.key?'◆':'—';$('score').textContent=String(game.score).padStart(5,'0');
  $('sector-number').textContent=`SECTOR 0${game.levelIndex+1} / ${String(LEVELS.length).padStart(2,'0')}`;$('sector-name').textContent=game.level.spec.name.toUpperCase();
  const bossAlive=game.level.enemies.some(e=>e.type==='boss'&&e.hp>0);
  $('objective').textContent=!p.key?'FIND THE GOLD KEY':bossAlive?'DEFEAT THE WARDEN':'REACH THE GOLD EXIT';
  $('crosshair').classList.toggle('hit',game.hitMarker>0);
  const target=game.nearbyAction();$('interact-hint').hidden=!target;
  if(target)$('interact-hint').textContent=target.type==='exit'?p.key?(bossAlive?'DEFEAT THE WARDEN FIRST':coarse?'TAP OPEN TO EXIT':'E · EXIT SECTOR'):'EXIT LOCKED · FIND GOLD KEY':coarse?'TAP OPEN TO OPEN DOOR':'E · OPEN DOOR';
  $('interact').style.borderColor=target?'#e9cb8e':'#ceb57766';
  renderer.minimap($('map'),game,expandedMap);
}
function updatePhase(){
  if(lastPhase===game.phase)return;
  lastPhase=game.phase;$('game').dataset.phase=game.phase;$('menu').hidden=game.phase!=='menu';$('play-ui').hidden=game.phase==='menu';
  $('footer-status').textContent=game.phase==='menu'?'BUILT FOR THE NEXT “ONE MORE TRY.”':game.phase==='playing'?'MISSION ACTIVE · STAY SHARP':'MISSION PAUSED';
  dirty=true;
}
function loop(now){
  const dt=Math.min((now-last)/1000,.05);last=now;
  input.forward=(keys.has('KeyW')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0)-stickY;
  input.strafe=(keys.has('KeyD')?1:0)-(keys.has('KeyA')?1:0)+stickX;
  input.turn=(keys.has('ArrowRight')?1:0)-(keys.has('ArrowLeft')?1:0);
  input.fire=keys.has('Space')||pointerFire;input.sprint=keys.has('ShiftLeft')||keys.has('ShiftRight');
  game.update(dt,input);input.look=0;events();updatePhase();
  if(game.phase==='playing'||dirty){
    const oldBob=game.bob;if(reducedMotion)game.bob=0;renderer.render(game,now/1000);game.bob=oldBob;dirty=false;
  }
  if(now-uiTime>80||game.phase!=='playing'){if(game.phase!=='menu')updateHUD();uiTime=now;}
  requestAnimationFrame(loop);
}
function toggleMap(){expandedMap=!expandedMap;$('map-wrap').classList.toggle('expanded',expandedMap);$('map-button').setAttribute('aria-pressed',String(expandedMap));$('map-button').setAttribute('aria-label',expandedMap?'Shrink map':'Expand map');}
$('start').addEventListener('click',start);
$('pause').addEventListener('click',pause);
$('continue').addEventListener('click',()=>{
  if(game.phase==='paused')resume();else if(game.phase==='dead')restart();else if(game.phase==='won')menu();else if(game.phase==='complete'){clearInput();$('dialog').close();game.next();rememberCheckpoint();dirty=true;$('scene').focus({preventScroll:true});notify(game.level.spec.subtitle,3500);}
});
$('restart').addEventListener('click',restart);$('menu-button').addEventListener('click',menu);
$('dialog').addEventListener('cancel',event=>{event.preventDefault();if(game.phase==='paused')resume();});
$('weapon').addEventListener('click',()=>game.cycleWeapon());$('reload').addEventListener('click',()=>game.reload());$('interact').addEventListener('click',()=>game.interact());$('map-button').addEventListener('click',toggleMap);
$('sound').addEventListener('click',()=>{muted=!muted;if(!muted){unlockAudio();tone('pickup');}save();updateMenu();});
$('fullscreen').addEventListener('click',async()=>{
  try{if(document.fullscreenElement)await document.exitFullscreen();else if(document.body.requestFullscreen){await document.body.requestFullscreen();if(coarse)screen.orientation?.lock?.('landscape').catch(()=>{});}else notify('Use your browser’s full-screen or Add to Home Screen option.');}
  catch{notify('Fullscreen is unavailable in this browser. You can keep playing here.');}
});
document.addEventListener('fullscreenchange',()=>{$('fullscreen').setAttribute('aria-label',document.fullscreenElement?'Exit fullscreen':'Enter fullscreen');dirty=true;});
$('mouse-aim').addEventListener('click',()=>{
  if(game.phase!=='playing'){notify('Enter the fortress first.');return;}
  try{const result=$('scene').requestPointerLock?.();result?.catch(()=>notify('Drag the scene to aim, or use the arrow keys.'));}catch{notify('Drag the scene to aim, or use the arrow keys.');}
});
document.addEventListener('pointerlockchange',()=>{if(!document.pointerLockElement&&game.phase==='playing')pause();});
document.addEventListener('mousemove',e=>{if(document.pointerLockElement&&game.phase==='playing')input.look+=clamp(e.movementX,-100,100)*.0027;});
const gameplayKeys=new Set(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','KeyE','KeyR','KeyM','Digit1','Digit2','Digit3','KeyQ','ShiftLeft','ShiftRight']);
window.addEventListener('keydown',event=>{
  if(event.code==='Escape'&&game.phase==='playing'){event.preventDefault();pause();return;}
  if(game.phase!=='playing'||!gameplayKeys.has(event.code)||event.target.matches('input,select,textarea'))return;
  event.preventDefault();keys.add(event.code);if(event.repeat)return;
  if(event.code==='KeyE')game.interact();if(event.code==='KeyR')game.reload();if(event.code==='KeyM')toggleMap();if(event.code==='KeyQ')game.cycleWeapon();
  if(event.code.startsWith('Digit'))game.switchWeapon(Number(event.code.slice(5))-1);
});
window.addEventListener('keyup',event=>keys.delete(event.code));
function setStick(e){const r=$('joystick').getBoundingClientRect(),limit=r.width*.32,dx=e.clientX-r.x-r.width/2,dy=e.clientY-r.y-r.height/2,mag=Math.max(limit,Math.hypot(dx,dy));stickX=dx/mag;stickY=dy/mag;$('stick').style.transform=`translate(${stickX*limit}px,${stickY*limit}px)`;}
$('joystick').addEventListener('pointerdown',e=>{if(game.phase!=='playing'||stickId!==null)return;e.preventDefault();stickId=e.pointerId;$('joystick').setPointerCapture(e.pointerId);setStick(e);});
$('joystick').addEventListener('pointermove',e=>{if(e.pointerId===stickId){e.preventDefault();setStick(e);}});
for(const type of ['pointerup','pointercancel','lostpointercapture'])$('joystick').addEventListener(type,e=>{if(e.pointerId===stickId){stickId=null;stickX=stickY=0;$('stick').style.transform='';}});
$('fire').addEventListener('pointerdown',e=>{if(game.phase!=='playing'||fireId!==null)return;e.preventDefault();fireId=e.pointerId;$('fire').setPointerCapture(e.pointerId);pointerFire=true;$('fire').classList.add('pressed');unlockAudio();});
for(const type of ['pointerup','pointercancel','lostpointercapture'])$('fire').addEventListener(type,e=>{if(e.pointerId===fireId){fireId=null;pointerFire=false;$('fire').classList.remove('pressed');}});
for(const surface of [$('scene'),$('look-zone')]){
  surface.addEventListener('pointerdown',e=>{
    if(game.phase!=='playing'||e.button!==0)return;e.preventDefault();
    if(e.pointerType==='mouse'){pointerFire=true;unlockAudio();}
    if(!document.pointerLockElement&&lookId===null){lookId=e.pointerId;lookX=e.clientX;surface.setPointerCapture(e.pointerId);}
  });
  surface.addEventListener('pointermove',e=>{if(e.pointerId===lookId&&!document.pointerLockElement){input.look+=clamp(e.clientX-lookX,-100,100)*(coarse?.006:.004);lookX=e.clientX;}});
  for(const type of ['pointerup','pointercancel','lostpointercapture'])surface.addEventListener(type,e=>{if(e.pointerId===lookId){lookId=null;if(e.pointerType==='mouse')pointerFire=false;}if(document.pointerLockElement&&e.pointerType==='mouse')pointerFire=false;});
}
window.addEventListener('mouseup',()=>{if(fireId===null)pointerFire=false;});
window.addEventListener('blur',pause);document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
$('game').addEventListener('contextmenu',e=>{if(game.phase==='playing')e.preventDefault();});
new ResizeObserver(()=>{renderer.resize();dirty=true;}).observe($('scene'));
if('serviceWorker'in navigator&&location.protocol!=='file:')navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).catch(()=>{});
updateMenu();requestAnimationFrame(loop);
