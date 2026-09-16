import { Batch } from './renderer.js';
export { Batch };
export function humanoid(b,p,yaw=0,o={}) {
  const type=o.type||'soldier',t=o.time||0,walk=o.walk?Math.sin(t*11)*.48:0,attack=o.attack||0;
  const suit=o.color||'#52646c',trim=o.trim||'#25323a',skin='#c18e68',scale=o.scale||1;
  b.frame(p,yaw,scale);
  const bulk=type==='hulk'?1.55:type==='chikoo'?1.23:1,child=['chikoo','bunty'].includes(type),ninja=type==='ninja';
  const torso=type==='hulk'?'#60844b':suit;
  b.add('sphere',[0,1.18,0],[.32*bulk,.43,.20*bulk],torso);
  b.add('box',[0,1.38,.04],[.27*bulk,.16,.17],torso);
  b.add('box',[0,.81,0],[.25*bulk,.11,.17],trim);
  b.add('box',[.03,.87,.19],[.075,.055,.03],o.trim||'#d4b16a');
  const head=child||type==='thor'?skin:type==='hulk'?'#6c8f52':suit;
  b.add('sphere',[0,1.85,0],[child?.27:.235,child?.3:.275,.23],head);
  if(child||type==='thor')b.add('sphere',[0,2.025,-.04],[.255,.13,.23],type==='thor'?'#b69660':'#282626');
  else b.add('box',[0,1.87,.197],[.188,.065,.047],type==='ironman'?'#d8b05d':ninja?'#c29974':'#172b34');
  const eye=child||type==='thor'?'#242b2f':o.enemy?'#ff725e':'#a6eff2';
  for(const side of [-1,1]){
    b.add('box',[side*.092,1.9,.235],[.043,.022,.023],eye);
    const knee=[side*.18*bulk,.42,side*walk*.50],foot=[side*.18*bulk,.10,side*walk*.9+.07];
    b.segment([side*.17*bulk,.8,0],knee,.12*bulk,child?'#313b56':trim);
    b.segment(knee,foot,.115*bulk,child?'#bd8d68':suit);
    b.add('box',[foot[0],.09,foot[2]+.06],[.13*bulk,.09,.23],trim);
    const elbow=[side*.42*bulk,1.05,-side*walk*.3+attack*.32],hand=[side*.40*bulk,.83+attack*.45,side*walk*.34+attack*.65];
    b.add('sphere',[side*.34*bulk,1.45,0],[.18,.20,.18],suit);
    b.segment([side*.35*bulk,1.4,0],elbow,.115*bulk,torso);
    b.segment(elbow,hand,.1*bulk,child?skin:suit);
    b.add('sphere',hand,[.115,.12,.12],child?skin:trim);
    if(type==='ironman')b.add('sphere',[side*.40*bulk,.83+attack*.45,side*walk*.34+attack*.65+.1],[.055,.06,.025],'#b9faff');
  }
  if(type==='ironman'){b.add('cylinder',[0,1.39,.21],[.092,.024,.092],'#b4f4ff',[Math.PI/2,0,0]);b.add('box',[0,1.09,.18],[.16,.1,.055],'#b58d50');}
  if(type==='captain'){b.add('gem',[0,1.44,.22],[.12,.14,.026],'#e6e8df');b.add('cylinder',[-.45,1.06,.38],[.4,.065,.4],'#b43735',[Math.PI/2,0,0]);b.add('cylinder',[-.45,1.06,.46],[.28,.015,.28],'#dfddd0',[Math.PI/2,0,0]);b.add('cylinder',[-.45,1.06,.48],[.19,.015,.19],'#3d6489',[Math.PI/2,0,0]);b.add('gem',[-.45,1.06,.51],[.12,.14,.026],'#e6e8df');}
  if(type==='thor'){b.add('box',[0,1.0,-.20],[.35,.65,.04],'#873b39');b.segment([.45,.9,.3],[.45,1.4,.3],.04,'#82654b');b.add('box',[.45,1.43,.3],[.24,.14,.13],'#afb7b6');}
  if(ninja){b.add('box',[0,1.77,.21],[.2,.085,.038],trim);b.add('box',[0,1.64,0],[.27,.035,.23],suit);b.segment([0,1.58,-.23],[.3+Math.sin(t*6)*.08,1.27,-.85],.075,suit);b.segment([-.3,.9,-.2],[.32,1.7,-.2],.025,'#d4e2d9');}
  if(type==='soldier'){b.add('box',[0,1.37,.19],[.235,.19,.08],'#667068');b.add('box',[0,1.27,.52],[.085,.075,.47],'#28343b');b.add('box',[0,1.38,.35],[.04,.035,.12],'#6b7e7e');b.add('box',[0,1.27,1.0],[.046,.046,.11],'#4d5a5d');}
  b.frame();
}
export function robot(b,p,yaw=0,o={}){
  b.frame(p,yaw,o.scale||1);const c=o.flash?'#fff4cc':o.color||'#686d6c',glow=o.glow||'#f69a63',stride=Math.sin((o.time||0)*7)*.25;
  b.add('box',[0,.9,0],[.32,.32,.25],c);b.add('box',[0,1.41,0],[.26,.18,.22],c);b.add('box',[0,1.42,.23],[.20,.045,.022],glow);
  b.add('box',[0,.98,.26],[.12,.12,.023],'#303b3e');b.add('gem',[0,.98,.3],[.085,.085,.02],glow);
  for(const s of [-1,1]){b.add('sphere',[s*.19,.48,0],[.12,.12,.12],'#28343a');b.segment([s*.2,.7,0],[s*.2,.17,s*stride],.105,c);b.add('box',[s*.2,.1,s*stride+.04],[.14,.09,.21],'#333f43');b.add('box',[s*.44,.94,.14],[.095,.23,.14],c);b.add('cylinder',[s*.44,.97,.35],[.055,.16,.055],'#26383b',[Math.PI/2,0,0]);}b.frame();
}
export function ghost(b,p,t=0,o={}){
  b.frame([p[0],p[1]+Math.sin(t*2.2)*.12,p[2]],o.yaw||0,o.scale||1);
  const c=o.flash?'#fdf5cd':o.color||'#a7d7ce';b.add('sphere',[0,.8,0],[.43,.56,.34],c);b.add('sphere',[0,1.32,0],[.37,.35,.32],c);
  for(const s of [-1,1]){b.add('sphere',[s*.15,1.35,.3],[.068,.09,.035],'#294749');b.segment([s*.3,1.0,0],[s*.68,1.12+Math.sin(t*3)*.1,.1],.1,c);b.add('cone',[s*.21,.2,0],[.14,.28,.16],c,[Math.PI,0,0]);}b.frame();
}
export function tree(b,x,z,s=1,color='#456b57'){
  b.add('cylinder',[x,s*1.6,z],[s*.13,s*1.6,s*.13],'#74634f');
  for(let i=0;i<3;i++)b.add('cone',[x,s*(2.6+i*.64),z],[s*(1.2-i*.25),s*1.05,s*(1.2-i*.25)],color);
}
export function rock(b,x,z,s=1,col='#717875'){b.add('low',[x,s*.38,z],[s,s*.7,s*.78],col,[.12,x,0]);}
export function crate(b,x,z,s=1){b.add('box',[x,s*.5,z],[s*.5,s*.5,s*.5],'#7e6c4f');for(const a of [-1,1]){b.add('box',[x+a*s*.4,s*.5,z],[s*.04,s*.51,s*.51],'#434a48');b.add('box',[x,s*.5,z+a*s*.4],[s*.51,s*.51,s*.04],'#434a48');}}
export function house(b,x,z,o={}){
  const h=o.h||3.5,w=o.w||2.5,d=o.d||2,brown=o.color||'#9e9b89';
  b.add('box',[x,h/2,z],[w,h/2,d],brown);b.add('box',[x,.1,z],[w+.15,.12,d+.15],'#77796d');
  if(o.pagoda){b.add('cone',[x,h+.7,z],[w*1.65,.9,d*1.65],'#3d5154');b.add('box',[x,h-.2,z],[w+.3,.12,d+.3],'#b49165');}
  else {b.add('box',[x,h+.12,z],[w+.15,.12,d+.15],'#676b63');b.add('box',[x,h+.45,z],[w*.3,.32,d*.45],'#737d77');}
  b.add('box',[x,.8,z+d+.01],[.42,.8,.025],'#384748');
  for(const side of [-1,1])for(let j=1;j<h-0.4;j+=1.25){b.add('box',[x+side*w*.63,j+.1,z+d+.02],[.28,.32,.04],o.lit?'#e8bd78':'#415a60');b.add('box',[x+side*w*.63,j+.1,z+d+.06],[.018,.32,.015],'#746c5c');}
}
export function tower(b,x,z,type='arrow',level=1,yaw=0){
 b.frame([x,0,z],yaw);const c=type==='frost'?'#6cacae':type==='cannon'?'#8b765b':'#9a947d';
 b.add('cylinder',[0,.6,0],[.57,.6,.57],'#787b70');b.add('cylinder',[0,1.27,0],[.72,.13,.72],c);
 for(let i=0;i<6;i++){const a=i*Math.PI/3;b.add('box',[Math.cos(a)*.61,1.5,Math.sin(a)*.61],[.14,.2,.14],c);}
 if(type==='frost'){b.add('gem',[0,2,0],[.34,.6,.34],'#b0eced');b.add('cylinder',[0,1.68,0],[.35,.1,.35],'#39777b');}
 else if(type==='cannon'){b.add('sphere',[0,1.7,0],[.37,.26,.35],'#455253');b.add('cylinder',[0,1.78,.5],[.17,.65,.17],'#4b595b',[Math.PI/2,0,0]);b.add('cylinder',[0,1.78,1.12],[.2,.07,.2],'#303f43',[Math.PI/2,0,0]);}
 else {b.segment([0,1.7,-.35],[0,1.7,.65],.055,'#5d4935');b.segment([-.5,1.7,.3],[.5,1.7,.3],.055,'#766444');}
 for(let i=0;i<level;i++)b.add('gem',[-.22+i*.22,.95,.54],[.07,.10,.025],'#edcd85');b.frame();
}
export function ring(b,p,r=1,color='#a4e1e5',rotation=0){for(let i=0;i<20;i++){const a=i*Math.PI/10,c=(i+1)*Math.PI/10;b.segment([p[0]+Math.cos(a)*r,p[1]+Math.sin(a)*r,p[2]],[p[0]+Math.cos(c)*r,p[1]+Math.sin(c)*r,p[2]],.065,color);}}
export function particles(b,list,dt){for(let i=list.length-1;i>=0;i--){const p=list[i];p.life-=dt;if(p.life<=0){list.splice(i,1);continue;}p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;p.vy-=dt*3;const s=Math.max(.015,p.life*.08);b.add('gem',[p.x,p.y,p.z],[s,s,s],p.color);}}
export function burst(list,x,y,z,color='#eec987',n=12){for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,v=1+Math.random()*3;list.push({x,y,z,vx:Math.cos(a)*v,vy:Math.random()*4,vz:Math.sin(a)*v,life:.3+Math.random()*.5,color});}}
