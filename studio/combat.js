import {clamp, distance} from './core.js';

export function healthBar(batch, enemy, height = 2.5, width = 1.35) {
  if (!(enemy.max > 0) || enemy.hp >= enemy.max || enemy.hp <= 0) return;
  const ratio=clamp(enemy.hp/enemy.max,0,1), y=height+(enemy.type==='boss'||enemy.boss?1:0);
  batch.add('box',[enemy.x,y,enemy.z],[width/2,.055,.055],'#283b3d');
  batch.add('box',[enemy.x-width*(1-ratio)/2,y+.008,enemy.z+.015],[Math.max(.005,width*ratio/2),.042,.06],ratio<.3?'#f0ab85':'#a3d5b7');
}
export function warningRing(batch, hazard, time) {
  const color=hazard.timer>.25?'#efc376':'#ff846f',r=hazard.radius;
  for(let i=0;i<24;i++){
    const a=i/24*Math.PI*2,b=(i+1)/24*Math.PI*2;
    batch.segment([hazard.x+Math.cos(a)*r,.1,hazard.z+Math.sin(a)*r],[hazard.x+Math.cos(b)*r,.1,hazard.z+Math.sin(b)*r],.05,color);
  }
  batch.add('gem',[hazard.x,.45+Math.sin(time*8)*.06,hazard.z],[.12,.32,.12],color);
}
// A locked target and visible windup give the player a fair chance to dodge.
export function advanceHazards(hazards,dt,player,onHit) {
  return hazards.filter(h=>{
    h.timer-=dt;
    if(h.timer>0)return true;
    if(distance(player,h)<h.radius)onHit(h.damage);
    return false;
  });
}
