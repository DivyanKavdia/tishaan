import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,LEVELS,buildLevel,castRay,isSolid,moveBody,lineOfSight} from '../games/iron-citadel/engine.js';

const advance=(game,seconds,input={})=>{for(let i=0;i<Math.ceil(seconds/.02);i++)game.update(.02,input);};
const quiet=game=>game.level.enemies.forEach(e=>e.hp=0);
function route(level,from,to){
  const queue=[[Math.floor(from.x),Math.floor(from.y)]],parent=new Map([[queue[0].join(','),null]]);
  for(let i=0;i<queue.length;i++){
    const [x,y]=queue[i];if(x===to[0]&&y===to[1]){
      const result=[];let key=to.join(',');while(parent.get(key)!==null){result.unshift(key.split(',').map(Number));key=parent.get(key);}return result;
    }
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const xx=x+dx,yy=y+dy,t=level.grid[yy]?.[xx],key=[xx,yy].join(',');
      if((t===0||t===4)&&!parent.has(key)){parent.set(key,[x,y].join(','));queue.push([xx,yy]);}
    }
  }
  return null;
}
function walkTo(game,x,y){
  const path=route(game.level,game.player,[Math.floor(x),Math.floor(y)]);assert.ok(path,`No path to ${x},${y} in ${game.level.spec.name}`);
  for(const [tx,ty] of path){
    game.player.a=Math.atan2(ty+.5-game.player.y,tx+.5-game.player.x);
    if(isSolid(game.level,tx,ty)){game.interact();advance(game,.7);assert.ok(!isSolid(game.level,tx,ty),'Door did not open from an adjacent tile');}
    for(let n=0;n<100&&Math.hypot(game.player.x-tx-.5,game.player.y-ty-.5)>.055;n++){
      game.player.a=Math.atan2(ty+.5-game.player.y,tx+.5-game.player.x);game.update(.02,{forward:1});
    }
    assert.ok(Math.hypot(game.player.x-tx-.5,game.player.y-ty-.5)<.06,'Could not walk along the route');
  }
}

test('citadel: every mission has reachable pickups, sentries, key and exit',()=>{
  LEVELS.forEach((spec,index)=>{
    const level=buildLevel(index),from={x:spec.start[0],y:spec.start[1]};
    assert.equal(level.grid.length,spec.size);assert.ok(level.grid.every(row=>row.length===spec.size));
    for(const e of [...level.items,...level.enemies])assert.ok(route(level,from,[Math.floor(e.x),Math.floor(e.y)]),`${spec.name}: unreachable ${e.type}`);
    const [x,y]=spec.exit;assert.ok([[x-1,y],[x+1,y],[x,y-1],[x,y+1]].some(to=>route(level,from,to)));
    assert.ok(level.grid[0].every(Boolean)&&level.grid.at(-1).every(Boolean));
  });
});
test('citadel: collision prevents wall tunneling, and doors block sight until open',()=>{
  const level=buildLevel(0),p={x:2.5,y:14.5};moveBody(level,p,-40,0);assert.ok(p.x>=1.22);
  const a={x:8.5,y:14.5},b={x:10.5,y:14.5};assert.equal(lineOfSight(level,a,b),false);
  const ray=castRay(level,a.x,a.y,1,0);assert.equal(ray.tile,4);assert.ok(Number.isFinite(ray.depth));
  level.doors.find(d=>d.x===9&&d.y===14).open=1;assert.equal(lineOfSight(level,a,b),true);
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]])assert.ok(Number.isFinite(castRay(level,2.5,14.5,dx,dy).depth));
});
test('citadel: shots hit only visible targets, consume ammo, and respect fire rate',()=>{
  const game=new Game();game.start();const enemy=game.level.enemies[0];game.fire();assert.equal(enemy.hp,32);assert.equal(game.player.ammo,11);
  game.fire();assert.equal(enemy.hp,32);advance(game,.32);game.fire();assert.equal(enemy.hp,0);assert.equal(game.kills,1);assert.equal(game.score,200);
  const e=game.level.enemies[1];Object.assign(game.player,{x:6.5,y:13.5,a:0});Object.assign(e,{x:8.5,y:13.5,hp:70});advance(game,.32);game.fire();assert.equal(e.hp,70,'Shot went through wall');
});
test('citadel: reload conserves ammunition; shock tool is available without ammo',()=>{
  const game=new Game();game.start();quiet(game);game.player.ammo=0;game.player.reserve=7;game.reload();advance(game,1.2);
  assert.equal(game.player.ammo,7);assert.equal(game.player.reserve,0);game.player.ammo=0;game.switchWeapon(1);assert.equal(game.player.weapon,0,'Locked repeater selected');
  game.switchWeapon(2);const e=game.level.enemies[0];Object.assign(e,{x:3.2,y:14.5,hp:40});game.fire();assert.equal(e.hp,0);assert.equal(game.player.ammo,0);
});
test('citadel: pausing freezes combat, movement, and reload timers',()=>{
  const game=new Game();game.start();game.player.ammo=1;game.reload();game.pause();const snapshot=JSON.stringify(game);advance(game,5,{forward:1,fire:true});game.fire();game.interact();assert.equal(JSON.stringify(game),snapshot);game.resume();advance(game,.2);assert.ok(game.reloading<1.05);
});
test('citadel: enemy attacks are telegraphed and can be dodged',()=>{
  const game=new Game();game.start();const e=game.level.enemies[0];e.cooldown=0;game.update(.02);assert.ok(e.windup>0);advance(game,1);assert.ok(game.player.hp<100);
  const dodged=new Game();dodged.start();dodged.level.enemies[0].cooldown=0;dodged.update(.02);moveBody(dodged.level,dodged.player,0,1.1);advance(dodged,1);assert.equal(dodged.player.hp,100);
});
test('citadel: supplies stay available at capacity and are picked up when needed',()=>{
  const game=new Game();game.start();quiet(game);const item=game.level.items.find(i=>i.type==='health');Object.assign(game.player,{x:item.x,y:item.y});game.update(.02);assert.equal(item.taken,false);game.player.hp=30;game.update(.02);assert.equal(game.player.hp,70);assert.equal(item.taken,true);
});
test('citadel: a complete nine-sector route opens doors, collects keys, and reaches victory',()=>{
  const game=new Game();game.start();
  for(let index=0;index<LEVELS.length;index++){
    quiet(game);const key=game.level.items.find(i=>i.type==='key');walkTo(game,key.x,key.y);assert.equal(game.player.key,true);
    const [ex,ey]=game.level.spec.exit,adjacent=[[ex-1,ey],[ex+1,ey],[ex,ey-1],[ex,ey+1]].find(to=>route(game.level,game.player,to));
    walkTo(game,adjacent[0]+.5,adjacent[1]+.5);game.player.a=Math.atan2(ey+.5-game.player.y,ex+.5-game.player.x);
    if(index===2){const boss=game.level.enemies.find(e=>e.type==='boss');boss.hp=1;game.interact();assert.equal(game.phase,'playing');boss.hp=0;}
    game.interact();assert.equal(game.phase,index===LEVELS.length-1?'won':'complete');if(index<LEVELS.length-1){game.next();assert.equal(game.player.key,false);assert.equal(game.levelIndex,index+1);}
  }
});
