import {Batch,mix} from './engine.js';
export const LAKE={x:19,z:0,rx:7.8,rz:6.2};
export const CAMP={x:0,z:8};
export const GUARDIANS=[{x:-19,z:-18,family:1,level:7,title:'Grove guardian',badge:'Grove sigil'},{x:24,z:-9,family:2,level:10,title:'Tide guardian',badge:'Tide sigil'},{x:7,z:-27,family:0,level:13,title:'Ember guardian',badge:'Ember sigil'}];
export const lakeDistance=(x,z)=>((x-LAKE.x)/LAKE.rx)**2+((z-LAKE.z)/LAKE.rz)**2;
export function height(x,z){const r=Math.hypot(x,z);if(lakeDistance(x,z)<1)return -.85;return .12+Math.sin(x*.16)*Math.cos(z*.14)*.25-Math.max(0,r-32)*.50;}
export function walkable(x,z){return Math.hypot(x,z)<31&&lakeDistance(x,z)>1.09;}
export function zone(x,z){return x>12?'Crystal coast':z<-20?'Ember highlands':x<-10?'Whisperwood':'Sunpetal meadow';}
let seed=73219;
export function random(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;}
export function makeWorld(){
 seed=73219;const b=new Batch(),obstacles=[],pickups=[];
 const H=(x,z)=>height(x,z);
 for(let x=-40;x<40;x+=2)for(let z=-40;z<40;z+=2){const r=Math.hypot(x,z),path=Math.abs(x-3*Math.sin(z*.14))<2.3;let col=r>30?'#c8bf97':path?'#d5caa2':x>13&&z<-11?'#909e89':x<-10?'#729970':'#98b875';const variation=(random()-.5)*.055;const rgb=[parseInt(col.slice(1,3),16)/255+variation,parseInt(col.slice(3,5),16)/255+variation,parseInt(col.slice(5,7),16)/255+variation];const A=[x,H(x,z),z],B=[x+2,H(x+2,z),z],C=[x+2,H(x+2,z+2),z+2],D=[x,H(x,z+2),z+2];b.triangle(A,C,B,rgb);b.triangle(A,D,C,rgb);}
 b.add('box',[0,-1.35,0],[110,.13,110],'#65abb0');
 b.add('sphere',[19,-.13,0],[7.5,.2,5.9],'#75bfca');b.add('sphere',[19,-.10,0],[6.6,.2,5.2],'#80c8ce');
 // Layered distant mountains soften the horizon around the explorable island.
 for(let i=0;i<22;i++){const a=i/22*Math.PI*2,r=47+random()*6,x=Math.cos(a)*r,z=Math.sin(a)*r;b.add('cone',[x,2,z],[5+random()*5,5+random()*9,5+random()*5],i%2?'#719a91':'#89aba0');}
 function tree(x,z,s,kind=0){const y=H(x,z);b.add('sphere',[x+.6,y+.026,z+.5],[s*1.5,.018,s*.9],'#638866');b.add('cylinder',[x,y+s,z],[s*.15,s,s*.15],'#81735a');if(kind){for(let j=0;j<3;j++)b.add('cone',[x,y+s*(1.65+j*.72),z],[s*(1.08-j*.2),s*.98,s*(1.08-j*.2)],['#527a6c','#608b73','#739c7a'][j]);}else{b.add('low',[x,y+s*2.5,z],[s*1.35,s*1.4,s*1.2],'#527d65');b.add('low',[x-s*.5,y+s*2.9,z+.1],[s,s,s*.9],'#77a274');b.add('low',[x+s*.6,y+s*2.75,z+.25],[s*.85,s*1.07,s*.85],'#8eb381');}obstacles.push({x,z,r:s*.5});}
 for(let i=0;i<90;i++){const x=(random()-.5)*65,z=(random()-.5)*65;if(!walkable(x,z)||Math.abs(x-3*Math.sin(z*.14))<5||Math.hypot(x,z-8)<8||GUARDIANS.some(g=>Math.hypot(x-g.x,z-g.z)<5))continue;tree(x,z,.8+random()*.65,x>10||z<-17?1:0);}
 // Pebbles, flowers and grass tufts use one static batch rather than hundreds of draw calls.
 for(let i=0;i<230;i++){const x=(random()-.5)*62,z=(random()-.5)*62;if(!walkable(x,z)||Math.abs(x-3*Math.sin(z*.14))<2.7||Math.hypot(x,z-8)<4)continue;const y=H(x,z);if(i%9===0)b.add('low',[x,y+.2,z],[.45,.35,.40],'#a8b29d');else if(i%3===0){b.add('cylinder',[x,y+.25,z],[.025,.25,.025],'#789564');b.add('sphere',[x,y+.51,z],[.13,.07,.13],i%2?'#f3d594':'#f0c0b7');}else{for(let j=0;j<2;j++)b.add('cone',[x+j*.12,y+.16,z],[.06,.24,.07],i%2?'#799c64':'#abc37f',[0,0,(j-.5)*.4]);}}
 // Camp tent, supply crates, a glowing heal crystal and a signpost.
 const cy=H(0,8);b.add('cylinder',[0,cy+.04,8],[3.1,.05,3.1],'#cbbc95');
 b.add('cone',[-1.6,cy+1.1,9.3],[1.3,1.2,1.5],'#e3c9a0',[0,Math.PI/4,0]);b.add('box',[-1.6,cy+.55,10.3],[.37,.53,.14],'#716e54');
 b.add('box',[1.4,cy+.31,9.4],[.5,.32,.43],'#937b55');b.add('box',[1.75,cy+.71,9.4],[.35,.14,.35],'#c0a172');
 b.add('cylinder',[.6,cy+.32,7],[.58,.33,.58],'#818b80');b.add('gem',[.6,cy+1.05,7],[.33,.6,.33],'#c3ecd9');
 for(let i=0;i<GUARDIANS.length;i++){const g=GUARDIANS[i],y=H(g.x,g.z);b.add('cylinder',[g.x,y+.08,g.z],[2.8,.09,2.8],'#a3ad93');for(const sign of [-1,1]){b.add('box',[g.x+sign*2.2,y+1.5,g.z-1],[.34,1.5,.36],'#8a9d92');b.add('gem',[g.x+sign*2.2,y+3.2,g.z-1],[.22,.5,.22],['#badb92','#a4e4e9','#ffc788'][i]);}b.add('box',[g.x,y+2.9,g.z-1],[2.5,.27,.42],'#93a79b');}
 for(let i=0;i<16;i++){let x,z;do{x=(random()-.5)*52;z=(random()-.5)*50;}while(!walkable(x,z));pickups.push({x,z,active:true,timer:0});}
 return {batch:b,obstacles,pickups};
}
