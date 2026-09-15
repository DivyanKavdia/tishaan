export const TAU = Math.PI * 2;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const angleDelta = a => Math.atan2(Math.sin(a), Math.cos(a));
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

// Rooms and connecting passages are explicit, so every mission is repeatable.
export const LEVELS = [
  { name: 'The Outpost', subtitle: 'Breach the outer walls', size: 19, wall: 1,
    rooms: [[1,12,6,6],[11,12,7,6],[7,6,5,6],[1,1,6,8],[13,1,5,8]],
    halls: [[7,14,4,1],[4,9,1,3],[7,7,6,1],[7,3,6,1],[15,9,1,3],[9,11,1,4]],
    doors: [[9,14],[4,10],[12,7],[9,3],[15,10]], pillars: [[3,5],[15,5]],
    start: [2.5,14.5,0], exit: [17,16], key: [2.5,2.5],
    guards: [[5.8,14.5,'guard'],[5,7,'guard'],[10,8,'scout'],[15,3,'guard'],[16,13,'guard'],[12,16,'scout']],
    items: [[2.5,16.5,'health'],[5.5,12.5,'ammo'],[5.5,2.5,'treasure'],[8.5,9.5,'ammo'],[16.5,7.5,'health'],[14.5,16.5,'treasure']] },
  { name: 'The Foundry', subtitle: 'Take back the weapons lab', size: 21, wall: 2,
    rooms: [[1,13,6,7],[9,13,11,7],[1,1,7,8],[10,1,10,8],[8,9,6,3]],
    halls: [[7,16,2,1],[4,9,1,4],[8,4,2,1],[16,8,1,5],[4,10,12,1],[10,11,1,2]],
    doors: [[7,16],[4,11],[8,4],[16,10],[10,12]], pillars: [[4,4],[13,4],[16,4],[13,16],[16,16]],
    start: [2.5,16.5,0], exit: [18,18], key: [18.5,2.5],
    guards: [[5.5,16.5,'scout'],[3.5,7.5,'guard'],[6.5,2.5,'guard'],[10.5,10.5,'scout'],[11.5,5.5,'guard'],[18.5,6.5,'scout'],[10.5,17.5,'guard'],[18.5,14.5,'guard']],
    items: [[2.5,18.5,'health'],[5.5,14.5,'rifle'],[6.5,6.5,'ammo'],[2.5,2.5,'treasure'],[12.5,10.5,'health'],[11.5,2.5,'ammo'],[17.5,7.5,'treasure'],[11.5,18.5,'ammo']] },
  { name: 'The Iron Citadel', subtitle: 'Shut down the Warden', size: 21, wall: 3,
    rooms: [[1,13,7,7],[12,13,8,7],[7,9,7,3],[1,1,19,6],[1,8,4,4],[16,8,4,4]],
    halls: [[8,16,4,1],[4,11,1,3],[16,11,1,3],[3,6,1,3],[17,6,1,3],[5,10,11,1],[10,6,1,3]],
    doors: [[9,16],[4,12],[16,12],[3,7],[17,7],[10,7]], pillars: [[5,3],[8,3],[12,3],[15,3],[15,16]],
    start: [2.5,16.5,0], exit: [18,2], key: [18.5,18.5],
    guards: [[6,16.5,'guard'],[3,9,'scout'],[9,10,'guard'],[17,10,'scout'],[13,15,'guard'],[18,15,'scout'],[4,4,'guard'],[16,4,'guard'],[10.5,3.5,'boss']],
    items: [[2.5,18.5,'health'],[6.5,14.5,'ammo'],[2.5,10.5,'treasure'],[10.5,10.5,'health'],[13.5,18.5,'ammo'],[18.5,9.5,'ammo'],[2.5,2.5,'health'],[18.5,5.5,'health'],[10.5,5.5,'ammo']] }
];

export function buildLevel(index) {
  const spec = LEVELS[index];
  const grid = Array.from({ length: spec.size }, () => Array(spec.size).fill(spec.wall));
  for (const [x,y,w,h] of [...spec.rooms, ...spec.halls])
    for (let j=y;j<y+h;j++) for (let i=x;i<x+w;i++) grid[j][i]=0;
  for (const [x,y] of spec.pillars) grid[y][x]=spec.wall;
  for (const [x,y] of spec.doors) grid[y][x]=4;
  grid[spec.exit[1]][spec.exit[0]]=5;
  return { spec, grid, doors: spec.doors.map(([x,y])=>({x,y,open:0,opening:false})),
    seen: Array.from({length:spec.size},()=>Array(spec.size).fill(false)),
    enemies: spec.guards.map(([x,y,type],id)=>({id,x,y,type,hp:type==='boss'?420:type==='scout'?50:70,maxHp:type==='boss'?420:type==='scout'?50:70,alert:false,cooldown:1.4+id*.17,windup:0,flash:0,dead:0,walk:0})),
    items: [...spec.items, [...spec.key,'key']].map(([x,y,type])=>({x,y,type,taken:false})) };
}

export function tileAt(level,x,y) { return level.grid[Math.floor(y)]?.[Math.floor(x)] ?? 1; }
export function isSolid(level,x,y) {
  const tile=tileAt(level,x,y);
  if (tile===4) return (level.doors.find(d=>d.x===Math.floor(x)&&d.y===Math.floor(y))?.open??0)<.9;
  return tile!==0;
}

// DDA uses the unnormalized camera ray; returned depth has no fisheye distortion.
export function castRay(level,x,y,dx,dy,maxDistance=40) {
  let mx=Math.floor(x), my=Math.floor(y), side=0;
  const deltaX=Math.abs(1/dx), deltaY=Math.abs(1/dy), sx=dx<0?-1:1, sy=dy<0?-1:1;
  let sideX=(dx<0?x-mx:mx+1-x)*deltaX, sideY=(dy<0?y-my:my+1-y)*deltaY;
  let depth=0;
  for(let n=0;n<128;n++) {
    if(sideX<sideY){depth=sideX;sideX+=deltaX;mx+=sx;side=0;}
    else {depth=sideY;sideY+=deltaY;my+=sy;side=1;}
    if(depth>maxDistance) break;
    const tile=tileAt(level,mx,my);
    if(tile===0) continue;
    let u=(side===0?y+depth*dy:x+depth*dx)%1; if(u<0)u+=1;
    const door=tile===4?level.doors.find(d=>d.x===mx&&d.y===my):null;
    if(door&&door.open>=.9) continue;
    return {depth:Math.max(.001,depth),side,tile,u,x:mx,y:my,door};
  }
  return {depth:maxDistance,side,tile:1,u:0,x:mx,y:my};
}

export function lineOfSight(level,a,b) {
  const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy);
  return d<.01||castRay(level,a.x,a.y,dx/d,dy/d,d+1).depth>d-.18;
}

export function moveBody(level,body,dx,dy,radius=.22) {
  const fits=(x,y)=>![[x-radius,y-radius],[x+radius,y-radius],[x-radius,y+radius],[x+radius,y+radius]].some(p=>isSolid(level,...p));
  const steps=Math.max(1,Math.ceil(Math.hypot(dx,dy)/.12));
  for(let i=0;i<steps;i++) {
    if(fits(body.x+dx/steps,body.y)) body.x+=dx/steps;
    if(fits(body.x,body.y+dy/steps)) body.y+=dy/steps;
  }
}

export class Game {
  constructor(difficulty='explorer') {
    this.difficulty=difficulty; this.phase='menu'; this.levelIndex=0; this.time=0;
    this.score=0; this.kills=0; this.shots=0; this.hits=0; this.events=[];
    this.player={x:0,y:0,a:0,hp:100,ammo:12,reserve:60,key:false,rifle:false,weapon:0};
    this.cooldown=0; this.reloading=0; this.flash=0; this.hurt=0; this.bob=0; this.hitMarker=0;
    this.loadLevel(0);
  }
  emit(type,data={}){this.events.push({type,...data});}
  loadLevel(index) {
    this.levelIndex=index; this.level=buildLevel(index);
    [this.player.x,this.player.y,this.player.a]=this.level.spec.start;
    this.player.key=false; this.player.hp=Math.max(75,this.player.hp);
    this.player.ammo=12; this.player.reserve=Math.max(48,this.player.reserve);
    this.reloading=0;this.cooldown=0;this.hurt=0;this.flash=0;this.levelKills=0;
    this.pathTimer=0;this.pathField=null;this.reveal();
  }
  start(){this.phase='playing';this.emit('start');}
  pause(){if(this.phase==='playing')this.phase='paused';}
  resume(){if(this.phase==='paused')this.phase='playing';}
  next(){if(this.phase==='complete'){this.loadLevel(this.levelIndex+1);this.phase='playing';this.emit('start');}}
  switchWeapon(weapon) {
    if(this.phase!=='playing')return;
    if(weapon===1&&!this.player.rifle) return;
    this.player.weapon=weapon;this.reloading=0;this.emit('switch');
  }
  cycleWeapon(){const options=this.player.rifle?[0,1,2]:[0,2];this.switchWeapon(options[(options.indexOf(this.player.weapon)+1)%options.length]);}
  reload(){
    if(this.phase!=='playing'||this.player.weapon===2||this.reloading||this.player.ammo>=12||!this.player.reserve)return;
    this.reloading=1.05;this.emit('reload');
  }
  fire(assist=false) {
    if(this.phase!=='playing'||this.cooldown>0||this.reloading>0) return;
    const p=this.player,melee=p.weapon===2;
    if(!melee&&p.ammo===0){if(p.reserve)this.reload();else {this.cooldown=.5;this.emit('empty');}return;}
    if(!melee){p.ammo--;this.shots++;}
    this.cooldown=melee?.48:p.weapon===1?.12:.30;this.flash=.13;
    this.emit('fire',{weapon:p.weapon});
    const candidates=this.level.enemies.filter(e=>e.hp>0).map(e=>({e,d:distance(p,e),angle:Math.abs(angleDelta(Math.atan2(e.y-p.y,e.x-p.x)-p.a))}));
    for(const {e,d} of candidates) if(d<7)e.alert=true;
    const target=candidates.filter(({e,d,angle})=>d<(melee?1.35:20)&&angle<(melee?.42:Math.atan2(e.type==='boss'?.46:.25,d)+(assist?.075:.015))&&lineOfSight(this.level,p,e)).sort((a,b)=>a.d-b.d)[0];
    if(target) {
      const e=target.e;e.hp-=melee?45:p.weapon===1?26:38;e.flash=.13;e.alert=true;this.hitMarker=.16;
      if(!melee)this.hits++;this.emit('hit');
      if(e.hp<=0){e.hp=0;e.windup=0;this.kills++;this.levelKills++;this.score+=e.type==='boss'?1500:200;this.emit('kill',{boss:e.type==='boss'});}
    }
    if(!melee&&p.ammo===0&&p.reserve)this.reload();
  }
  nearbyAction() {
    const p=this.player;
    const targets=[...this.level.doors.filter(d=>d.open<.9).map(d=>({type:'door',x:d.x+.5,y:d.y+.5,door:d})),{type:'exit',x:this.level.spec.exit[0]+.5,y:this.level.spec.exit[1]+.5}];
    return targets.filter(t=>distance(t,p)<1.65&&Math.abs(angleDelta(Math.atan2(t.y-p.y,t.x-p.x)-p.a))<1.1&&lineOfSight(this.level,p,{x:p.x+(t.x-p.x)*.6,y:p.y+(t.y-p.y)*.6})).sort((a,b)=>distance(a,p)-distance(b,p))[0];
  }
  interact(){
    if(this.phase!=='playing')return;
    const target=this.nearbyAction();
    if(!target){this.emit('message',{text:'Face a door or the gold exit, then use OPEN.'});return;}
    if(target.type==='door'){target.door.opening=true;this.emit('door');return;}
    if(!this.player.key){this.emit('message',{text:'Find the gold key to unlock the exit.'});return;}
    if(this.level.enemies.some(e=>e.type==='boss'&&e.hp>0)){this.emit('message',{text:'Defeat the Warden to unlock the exit.'});return;}
    this.score+=500;this.phase=this.levelIndex===LEVELS.length-1?'won':'complete';this.emit('complete');
  }
  reveal(){
    const {x,y}=this.player,n=this.level.spec.size;
    for(let j=Math.max(0,Math.floor(y)-3);j<Math.min(n,y+4);j++) for(let i=Math.max(0,Math.floor(x)-3);i<Math.min(n,x+4);i++) if(Math.hypot(i+.5-x,j+.5-y)<4)this.level.seen[j][i]=true;
  }
  updatePath(){
    const n=this.level.spec.size,px=Math.floor(this.player.x),py=Math.floor(this.player.y);
    const field=Array.from({length:n},()=>Array(n).fill(Infinity)),queue=[[px,py]];field[py][px]=0;
    for(let k=0;k<queue.length;k++){
      const [x,y]=queue[k];
      for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
        const xx=x+dx,yy=y+dy;
        if(field[yy]?.[xx]!==Infinity||isSolid(this.level,xx,yy))continue;
        field[yy][xx]=field[y][x]+1;queue.push([xx,yy]);
      }
    }
    this.pathField=field;
  }
  update(dt,input={}) {
    if(this.phase!=='playing'||!Number.isFinite(dt)||dt<0)return;
    dt=clamp(dt,0,.05);this.time+=dt;
    this.cooldown=Math.max(0,this.cooldown-dt);this.flash=Math.max(0,this.flash-dt);this.hurt=Math.max(0,this.hurt-dt);this.hitMarker=Math.max(0,this.hitMarker-dt);
    const p=this.player;
    if(this.reloading>0){this.reloading-=dt;if(this.reloading<=0){const n=Math.min(12-p.ammo,p.reserve);p.ammo+=n;p.reserve-=n;this.reloading=0;this.emit('loaded');}}
    p.a=angleDelta(p.a+(input.turn||0)*dt*2.1+(input.look||0));
    let forward=input.forward||0,strafe=input.strafe||0;
    const magnitude=Math.max(1,Math.hypot(forward,strafe));forward/=magnitude;strafe/=magnitude;
    const speed=(input.sprint?3.5:2.6)*dt;
    moveBody(this.level,p,(Math.cos(p.a)*forward-Math.sin(p.a)*strafe)*speed,(Math.sin(p.a)*forward+Math.cos(p.a)*strafe)*speed);
    this.bob+=Math.hypot(forward,strafe)*dt*9;this.reveal();
    for(const d of this.level.doors)if(d.opening)d.open=Math.min(1,d.open+dt*1.7);
    if(input.fire)this.fire(input.assist);
    for(const item of this.level.items){
      if(item.taken||distance(p,item)>.55)continue;
      if(item.type==='health'){if(p.hp>=100)continue;p.hp=Math.min(100,p.hp+40);}
      if(item.type==='ammo'){if(p.reserve>=120)continue;p.reserve=Math.min(120,p.reserve+30);}
      if(item.type==='key')p.key=true;
      if(item.type==='treasure')this.score+=500;
      if(item.type==='rifle'){p.rifle=true;p.weapon=1;p.reserve=Math.min(120,p.reserve+48);}
      item.taken=true;this.emit('pickup',{item:item.type});
    }
    this.pathTimer-=dt;if(this.pathTimer<=0){this.updatePath();this.pathTimer=.4;}
    for(const e of this.level.enemies) {
      e.flash=Math.max(0,e.flash-dt);
      if(e.hp<=0){e.dead+=dt;continue;}
      const d=distance(e,p),visible=d<11&&lineOfSight(this.level,e,p);
      if(visible&&d<8)e.alert=true;
      if(!e.alert)continue;
      e.cooldown-=dt;
      if(e.windup>0){
        e.windup-=dt;
        if(e.windup<=0){
          if(visible&&distance(p,e.target)<(this.difficulty==='explorer'?.64:.9)){
            const damage=(e.type==='boss'?18:e.type==='scout'?7:10)*(this.difficulty==='explorer'?.6:1);
            p.hp=Math.max(0,p.hp-damage);this.hurt=.28;this.emit('hurt');
            if(p.hp<=0){this.phase='dead';this.emit('dead');break;}
          }
          e.cooldown=(e.type==='boss'?1.4:2)+(this.difficulty==='explorer'?.65:0);this.emit('enemy-fire',{distance:d});
        }
        continue;
      }
      if(visible&&d<7&&e.cooldown<=0){e.windup=this.difficulty==='explorer'?.85:.6;e.target={x:p.x,y:p.y};continue;}
      if(d>(visible?2.2:.7)){
        let tx=p.x,ty=p.y;
        if(!visible){
          const x=Math.floor(e.x),y=Math.floor(e.y),choices=[[x+1,y],[x-1,y],[x,y+1],[x,y-1]].filter(([xx,yy])=>Number.isFinite(this.pathField[yy]?.[xx])).sort((a,b)=>this.pathField[a[1]][a[0]]-this.pathField[b[1]][b[0]]);
          if(!choices.length)continue;[tx,ty]=choices[0].map(v=>v+.5);
        }
        const a=Math.atan2(ty-e.y,tx-e.x),speed=(e.type==='scout'?1.1:e.type==='boss'?.45:.7)*dt;
        const crowded=this.level.enemies.some(other=>other!==e&&other.hp>0&&Math.hypot(other.x-e.x-Math.cos(a)*speed,other.y-e.y-Math.sin(a)*speed)<.44);
        if(!crowded)moveBody(this.level,e,Math.cos(a)*speed,Math.sin(a)*speed);e.walk+=dt*7;
      }
    }
  }
}
