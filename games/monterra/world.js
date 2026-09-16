import {Batch} from './engine.js';
import {WORLD_RADIUS,CAMP,LAKES,lakeDistance,inWater,walkable} from './geography.js';
export {WORLD_RADIUS,CAMP,LAKES,lakeDistance,walkable};
export const LAKE=LAKES[0];
export const GUARDIANS=[{x:-19,z:-18,family:1,level:7,title:'Grove guardian',badge:'Grove sigil'},{x:24,z:-9,family:2,level:10,title:'Tide guardian',badge:'Tide sigil'},{x:7,z:-27,family:0,level:13,title:'Ember guardian',badge:'Ember sigil'},{x:-22,z:8,family:3,level:16,title:'Storm guardian',badge:'Storm sigil'},{x:12,z:22,family:4,level:19,title:'Stone guardian',badge:'Stone sigil'},{x:-4,z:-24,family:1,level:23,title:'Ancient guardian',badge:'Ancient sigil'}];
export function height(x,z){
  if(inWater(x,z,1))return -.85;
  const broad=Math.sin(x*.035)*Math.cos(z*.031)*1.15;
  const ridges=Math.sin((x+z)*.071)*.36+Math.cos((x-z)*.057)*.28;
  const highlands=z<-70?Math.max(0,(-z-70)/80)*2.2:0;
  const north=x<-90&&z>55?.7*Math.sin(z*.08):0;
  const edge=Math.max(0,Math.hypot(x,z)-(WORLD_RADIUS-18))*.055;
  return .14+broad+ridges+highlands+north-edge;
}
export function zone(x,z){
  if(Math.hypot(x,z)<34)return x>12?'Crystal coast':z<-20?'Ember highlands':x<-10?'Whisperwood':'Sunpetal meadow';
  if(z<-105)return 'Ashen frontier';
  if(z>105)return 'Northwind range';
  if(x<-110)return 'Elderwood wilds';
  if(x>110)return 'Sunstone plains';
  if(x<0&&z>35)return 'Mossvale forest';
  if(x>35&&z>25)return 'Golden prairie';
  if(x<0&&z<-35)return 'Frostpine reaches';
  return 'Open wilds';
}
let seed=73219;
export function random(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;}
function terrainColor(x,z,path){
  if(path)return '#c9bd91';
  if(z<-105)return '#8f806a';
  if(z>105)return '#839a8b';
  if(x<-110)return '#58765f';
  if(x>110)return '#b8aa72';
  if(x<0&&z>35)return '#668965';
  if(x>35&&z>25)return '#9fb577';
  if(x<0&&z<-35)return '#708a79';
  return '#91ad72';
}
export function makeWorld(){
 seed=73219;const b=new Batch(),obstacles=[],pickups=[];
 const H=(x,z)=>height(x,z),step=6,limit=WORLD_RADIUS+8;
 // A large continuous terrain mesh replaces the former tiny 31-unit island.
 for(let x=-limit;x<limit;x+=step)for(let z=-limit;z<limit;z+=step){
   const cx=x+step*.5,cz=z+step*.5,r=Math.hypot(cx,cz);if(r>WORLD_RADIUS+8)continue;
   const path=r<45&&Math.abs(cx-3*Math.sin(cz*.14))<2.8;
   const col=terrainColor(cx,cz,path),variation=(random()-.5)*.07;
   const rgb=[parseInt(col.slice(1,3),16)/255+variation,parseInt(col.slice(3,5),16)/255+variation,parseInt(col.slice(5,7),16)/255+variation];
   const A=[x,H(x,z),z],B=[x+step,H(x+step,z),z],C=[x+step,H(x+step,z+step),z+step],D=[x,H(x,z+step),z+step];
   b.triangle(A,C,B,rgb);b.triangle(A,D,C,rgb);
 }
 b.add('box',[0,-2.6,0],[WORLD_RADIUS*2.25,.18,WORLD_RADIUS*2.25],'#579aa7');
 for(const l of LAKES){b.add('sphere',[l.x,-.16,l.z],[l.rx*.97,.22,l.rz*.97],'#69aebd');b.add('sphere',[l.x,-.12,l.z],[l.rx*.85,.2,l.rz*.84],'#79bec6');}
 // Distant peaks visually close the horizon but sit outside the playable frontier.
 for(let i=0;i<42;i++){const a=i/42*Math.PI*2,r=WORLD_RADIUS+18+random()*22,x=Math.cos(a)*r,z=Math.sin(a)*r;b.add('cone',[x,3,z],[9+random()*10,11+random()*20,9+random()*10],i%2?'#647c79':'#80928b');}
 function tree(x,z,s,kind=0){const y=H(x,z);b.add('sphere',[x+.6,y+.026,z+.5],[s*1.5,.018,s*.9],'#4d7257');b.add('cylinder',[x,y+s,z],[s*.15,s,s*.15],'#74644e');if(kind){for(let j=0;j<3;j++)b.add('cone',[x,y+s*(1.65+j*.72),z],[s*(1.08-j*.2),s*.98,s*(1.08-j*.2)],['#446a5c','#537866','#688d6d'][j]);}else{b.add('low',[x,y+s*2.5,z],[s*1.35,s*1.4,s*1.2],'#4d765d');b.add('low',[x-s*.5,y+s*2.9,z+.1],[s,s,s*.9],'#6f996b');b.add('low',[x+s*.6,y+s*2.75,z+.25],[s*.85,s*1.07,s*.85],'#86aa79');}obstacles.push({x,z,r:s*.5});}
 // Vegetation is spread across the whole map, with denser forest biomes.
 for(let i=0;i<390;i++){const a=random()*Math.PI*2,r=Math.sqrt(random())*(WORLD_RADIUS-9),x=Math.cos(a)*r,z=Math.sin(a)*r;if(!walkable(x,z)||Math.hypot(x,z-8)<9||GUARDIANS.some(g=>Math.hypot(x-g.x,z-g.z)<5))continue;const forest=x<-70||x<15&&z>42||z>105;const sparse=x>105||z<-115;if(sparse&&random()<.63)continue;if(!forest&&random()<.26)continue;tree(x,z,.72+random()*.75,z>80||z<-55?1:0);}
 // Rocks, flowers and grass landmarks make long-distance travel feel inhabited.
 for(let i=0;i<520;i++){const a=random()*Math.PI*2,r=Math.sqrt(random())*(WORLD_RADIUS-7),x=Math.cos(a)*r,z=Math.sin(a)*r;if(!walkable(x,z)||Math.hypot(x,z-8)<5)continue;const y=H(x,z);if(i%11===0)b.add('low',[x,y+.25,z],[.5,.42,.46],z<-90?'#887c70':'#9ba696');else if(i%4===0){b.add('cylinder',[x,y+.25,z],[.025,.25,.025],'#718c5f');b.add('sphere',[x,y+.51,z],[.13,.07,.13],i%2?'#efd18b':'#e8b7ae');}else{for(let j=0;j<2;j++)b.add('cone',[x+j*.12,y+.16,z],[.06,.24,.07],i%2?'#708f5b':'#9eb775',[0,0,(j-.5)*.4]);}}
 // Camp remains at the center so existing quests, saves and recovery still work.
 const cy=H(0,8);b.add('cylinder',[0,cy+.04,8],[3.1,.05,3.1],'#cbbc95');
 b.add('cone',[-1.6,cy+1.1,9.3],[1.3,1.2,1.5],'#e3c9a0',[0,Math.PI/4,0]);b.add('box',[-1.6,cy+.55,10.3],[.37,.53,.14],'#716e54');
 b.add('box',[1.4,cy+.31,9.4],[.5,.32,.43],'#937b55');b.add('box',[1.75,cy+.71,9.4],[.35,.14,.35],'#c0a172');
 b.add('cylinder',[.6,cy+.32,7],[.58,.33,.58],'#818b80');b.add('gem',[.6,cy+1.05,7],[.33,.6,.33],'#c3ecd9');
 for(let i=0;i<GUARDIANS.length;i++){const g=GUARDIANS[i],y=H(g.x,g.z);b.add('cylinder',[g.x,y+.08,g.z],[2.8,.09,2.8],'#a3ad93');for(const sign of [-1,1]){b.add('box',[g.x+sign*2.2,y+1.5,g.z-1],[.34,1.5,.36],'#8a9d92');b.add('gem',[g.x+sign*2.2,y+3.2,g.z-1],[.22,.5,.22],['#badb92','#a4e4e9','#ffc788','#e6d38d','#bdd2dc','#d9c1db'][i]);}b.add('box',[g.x,y+2.9,g.z-1],[2.5,.27,.42],'#93a79b');}
 for(const g of GUARDIANS){for(let j=0;j<9;j++){const a=j/9*Math.PI*2,x=g.x+Math.cos(a)*3.7,z=g.z+Math.sin(a)*3.7;if(walkable(x,z))b.add('low',[x,H(x,z)+.18,z],[.38,.22,.34],'#7d9182',[.05,a,.1]);}}
 // More collectible nodes reward exploration far outside the original island.
 for(let i=0;i<54;i++){let x,z,attempts=0;do{const a=random()*Math.PI*2,r=Math.sqrt(random())*(WORLD_RADIUS-8);x=Math.cos(a)*r;z=Math.sin(a)*r;attempts++;}while(!walkable(x,z)&&attempts<40);if(walkable(x,z))pickups.push({x,z,active:true,timer:0});}
 // Landmark stones indicate the four long-distance regions without blocking movement.
 const landmarks=[[-145,0,'#9cc690'],[145,0,'#e3c477'],[0,-145,'#d28d68'],[0,145,'#a8cbd1']];
 for(const [x,z,col] of landmarks){const y=H(x,z);b.add('cylinder',[x,y+.5,z],[1.8,.52,1.8],'#78877a');b.add('gem',[x,y+2.25,z],[.55,1.35,.55],col);}
 return {batch:b,obstacles,pickups};
}
