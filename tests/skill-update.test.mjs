import test from 'node:test';
import assert from 'node:assert/strict';
import {createMatch,stepMatch} from '../games/avengers-arena/src/engine.js';
import {CandyGame,availableMoves,recommendMove} from '../games/candy-pop/engine.js';
import {Strike} from '../games/world-strike/game.js';
import {Keep} from '../games/dragon-keep/game.js';
import {Chase} from '../games/chikoo-bunty/game.js';
import {Village} from '../games/ghost-village/game.js';
import {Flight} from '../games/iron-flight/game.js';
import {PrideLands} from '../games/pride-lands/game.js';
import {Game as Citadel} from '../games/iron-citadel/engine.js';
import {normalize,freshState} from '../games/monterra/core.js';
import {habitatSpawns,walkable,WORLD_RADIUS} from '../games/monterra/geography.js';
import {DIFFICULTIES,seeded} from '../studio/core.js';
import {advanceHazards} from '../studio/combat.js';
import {normalizePassport,recordRun,visitGame,gameProgress,readPassport} from '../studio/passport.js';

const shell=()=>({time:0,renderer:{aspect:1.5},stick:{x:0},setWorld(){},hud(){},button(){},toast(){},tone(){},tools(html,fn){this.tool=fn;},finish(won,result){this.result={won,...result};}});
const input=(x=0,z=0,fire=false)=>({x,z,keys:new Set(),held:id=>fire&&id==='primary'});

test('Avengers: a timed guard parries, holding guard cannot repeatedly parry, and a counter rewards timing',()=>{
  const m=createMatch({random:()=>1});m.state='fighting';m.aiTimer=99;m.aiInput={};m.player.x=300;m.enemy.x=390;
  m.enemy.attack={kind:'punch',elapsed:.11,fired:false,direction:-1,duration:.34};m.enemy.cooldown=1;
  stepMatch(m,{guard:true},.02);
  assert.equal(m.player.parries,1);assert.equal(m.player.hp,m.player.maxHp);assert.ok(m.player.counterWindow>0);
  const hp=m.enemy.hp;for(let i=0;i<10;i++)stepMatch(m,{attack:true},.02);
  assert.ok(hp-m.enemy.hp>=15,'counter increases the normal ten-damage hit');
  for(let i=0;i<40;i++)stepMatch(m,{guard:true},.02);
  m.enemy.attack={kind:'punch',elapsed:.11,fired:false,direction:-1,duration:.34};m.enemy.stun=0;
  stepMatch(m,{guard:true},.02);assert.equal(m.player.parries,1);assert.ok(m.player.hp<m.player.maxHp);
});

test('Candy: one rewind restores the exact board and objectives, persists, and cannot refund a booster',()=>{
  const g=new CandyGame(25,seeded(39),'relaxed'),before=g.snapshot();
  g.play(...availableMoves(g.board)[0]);assert.ok(g.history);
  const restored=CandyGame.restore(g.snapshot(),seeded(7));assert.ok(restored?.undo());
  for(const key of ['board','jelly','score','moves','collected','boosters'])assert.deepEqual(restored[key],before[key]);
  assert.equal(restored.undo(),false);assert.equal(CandyGame.restore(restored.snapshot()).rewinds,0);
  g.boost('hammer',0);assert.equal(g.undo(),false);
});

test('Candy: objective-aware hints leave the board and its random source untouched',()=>{
  let draws=0;const random=seeded(81),g=new CandyGame(25,()=>{draws++;return random();});
  const before=g.snapshot(),count=draws,hint=recommendMove(g);
  assert.ok(hint?.cells.length===2);assert.equal(draws,count);assert.deepEqual(g.snapshot(),before);
  assert.ok(availableMoves(g.board).some(pair=>pair.every((v,i)=>v===hint.cells[i])));
});

test('World Strike: repeated ordinary reloads work and the timed window rewards only a deliberate second press',()=>{
  const s=shell(),g=new Strike(s);g.start(0,DIFFICULTIES.story,{weapon:'rifle'});
  g.ammo=3;g.action('aux');for(let i=0;i<80;i++)g.update(.02,input());assert.equal(g.reload,0);assert.equal(g.ammo,30);
  g.ammo=1;g.action('aux');assert.ok(g.reload>0);for(let i=0;i<30;i++)g.update(.02,input());g.action('aux');
  assert.equal(g.reload,0);assert.equal(g.ammo,30);assert.equal(g.precisionShots,6);assert.equal(g.perfectReloads,1);
  g.ammo=0;g.action('aux');g.action('aux');assert.ok(g.reload>0);assert.equal(g.perfectReloads,1);
});

test('Dragon Keep: target priority changes which enemy a tower attacks',()=>{
  const s=shell(),g=new Keep(s);globalThis.document={getElementById:()=>({style:{}})};
  try{g.start(0,DIFFICULTIES.story);}finally{delete globalThis.document;}
  const p=g.pads[0];g.tap([p.x,p.z]);s.tool('target');assert.equal(p.tower.priority,'strongest');
  const a={x:p.x+2,z:p.z,hp:60,max:60,progress:10,speed:0,slow:0,type:'normal'},b={...a,x:p.x+3,hp:500,max:500,progress:0};
  g.enemies=[a,b];g.update(.001);assert.equal(g.shots[0].target,b);
  s.tool('target');p.tower.cd=0;g.shots=[];a.x=p.x+1;a.z=p.z;b.x=p.x+3;b.z=p.z;g.update(.001);assert.equal(g.shots[0].target,a);
});

test('Chase: an actual hurdle jump earns a skill chain and a collision resets it',()=>{
  const s=shell(),g=new Chase(s);g.start(0,DIFFICULTIES.normal,{});g.distance=31.9;g.y=1.5;g.vy=0;
  g.obstacles=[{d:32,lane:1,type:'hurdle',hit:false}];g.update(.01,input());assert.equal(g.perfectMoves,1);assert.equal(g.skillChain,1);
  g.y=0;g.obstacles=[{d:g.distance+.05,lane:1,type:'cart',hit:false}];g.update(.01,input());assert.equal(g.skillChain,0);assert.equal(g.hp,g.maxHp-1);
});

test('Ghost Village: frost shatter and three-leader relay require different ninjas',()=>{
  const s=shell(),g=new Village(s);g.start(0,DIFFICULTIES.story,{ninja:'1'});
  const e={x:0,z:4,hp:1000,max:1000,type:'boss',frozen:0,cd:99,flash:0};g.enemies=[e];g.action('special');g.active=0;g.strike();
  assert.equal(g.shatters,1);assert.equal(e.frozen,0);
  g.active=1;g.cool=0;g.strike();g.active=2;g.cool=0;g.strike();assert.equal(g.relays,1);
});

test('Iron Flight: exact ring centers award a precision bonus',()=>{
  const s=shell(),g=new Flight(s);g.start(0,DIFFICULTIES.story,{});g.gates=[{x:0,y:4.5,d:1,done:false}];g.distance=.99;g.update(.02,input());
  assert.equal(g.perfectRings,1);assert.equal(g.bestCombo,1);assert.ok(g.score>=300);
});

test('Pride Lands: hunts replenish prey, feed the pride, and sprint cannot be chained without recharging',()=>{
  const s=shell(),g=new PrideLands(s);g.start(0,DIFFICULTIES.story,{});g.pride.hp=60;g.prey[0].hp=0;g.prey[1].hp=0;g.update(.01,input());
  assert.equal(g.prey.length,5);assert.equal(g.food,2);assert.equal(g.pride.hp,76);
  g.action('aux');for(let i=0;i<130;i++)g.update(.02,input());assert.equal(g.sprint,0);g.action('aux');assert.equal(g.sprint,0);assert.ok(g.sprintCd>0);
});

test('Pride Lands: an unattended rival damages the pride and an attentive player can finish the first territory',()=>{
  const s=shell(),g=new PrideLands(s);g.start(0,DIFFICULTIES.story,{});
  g.enemies=[{x:0,z:1,hp:66,max:66,cd:0,stun:0,flash:0}];g.update(.02,input());assert.ok(g.pride.hp<100);
  g.start(0,DIFFICULTIES.story,{});s.result=null;
  for(let t=0;t<240&&!s.result;t+=.025){
    s.time=t;const target=g.enemies.filter(e=>e.hp>0).sort((a,b)=>Math.hypot(a.x,a.z)-Math.hypot(b.x,b.z))[0]||g.prey[0];
    const dx=target.x-g.player.x,dz=target.z-g.player.z,d=Math.hypot(dx,dz),moving=d>1.8;
    if(g.enemies.filter(e=>Math.hypot(e.x-g.player.x,e.z-g.player.z)<7).length>=2)g.action('special');
    if(d>6)g.action('aux');g.update(.025,input(moving?dx/d:0,moving?dz/d:0,true));g.fx=[];
  }
  assert.equal(s.result?.won,true);
});

test('Iron Citadel: recon has a cooldown, pauses correctly, and grades actual sector objectives',()=>{
  const g=new Citadel();g.start();assert.ok(g.scan());assert.equal(g.scan(),false);
  assert.ok(g.level.seen.flat().filter(Boolean).length>30);g.pause();const t=g.scanTime;g.update(1,{});assert.equal(g.scanTime,t);
  g.level.items.filter(i=>i.type==='treasure').forEach(i=>i.taken=true);g.player.hp=70;g.shots=10;g.hits=7;assert.equal(g.missionGrade().stars,3);
  g.hits=2;assert.equal(g.missionGrade().stars,2);
});

test('Monterra: expanded-island saves retain distant positions and every habitat spawn is on land',()=>{
  const state=freshState();state.position={x:174,z:22};assert.deepEqual(normalize(state).position,state.position);
  state.position={x:19,z:0};assert.deepEqual(normalize(state).position,{x:0,z:8});
  const spawns=habitatSpawns();assert.ok(spawns.length>=50);assert.ok(spawns.every(([,x,z])=>walkable(x,z)&&Math.hypot(x,z)<WORLD_RADIUS));
});

test('Telegraphed hazards lock their target, allow escape, and hit once',()=>{
  let hits=0,marks=[{x:0,z:0,radius:3,timer:1,damage:10}];
  marks=advanceHazards(marks,.8,{x:0,z:0},()=>hits++);assert.equal(hits,0);
  marks=advanceHazards(marks,.3,{x:4,z:0},()=>hits++);assert.equal(hits,0);assert.equal(marks.length,0);
  marks=advanceHazards([{x:0,z:0,radius:3,timer:.1,damage:10}],.2,{x:0,z:0},()=>hits++);assert.equal(hits,1);assert.equal(marks.length,0);
});

test('Game Zone records preserve best results across difficulties without counting a stage twice',()=>{
  assert.equal(normalizePassport({games:{broken:{visits:Infinity,records:{'normal:0':{score:Infinity,stars:99,time:-1}}}}}).games.broken.records['normal:0'].score,0);
  visitGame('test-game');recordRun('test-game',{level:0,score:250,stars:3,seconds:80});recordRun('test-game',{level:0,score:20,stars:1,seconds:90});recordRun('test-game',{level:0,difficulty:'expert',score:300,stars:2});
  const p=gameProgress('test-game');assert.equal(p.cleared,1);assert.equal(p.stars,3);assert.equal(p.best,300);assert.equal(readPassport().games['test-game'].records['normal:0'].time,80);
});
