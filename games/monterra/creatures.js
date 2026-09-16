import {FAMILIES} from './core.js';
const C={cream:'#fff1d5',dark:'#283b43',white:'#fffdf3',pink:'#f0a6a1',claw:'#e9dfc9'};
function eye(add,side,y,shine=false){add('sphere',[side*.25,y+.06,.80],[.118,.154,.052],C.white);add('sphere',[side*.25,y+.055,.837],[.064,.095,.026],C.dark);add('sphere',[side*.232,y+.105,.862],[.022,.031,.01],shine?'#fff7c8':C.white);}
function paw(add,x,y,z,body,walking,time,phase=0){const step=walking?Math.sin(time*9+phase)*.085:0;add('sphere',[x,y+.14+step,z],[.18,.22,.22],body);add('sphere',[x,y+.045+step,z+.10],[.19,.09,.23],C.cream);for(const dx of [-.07,0,.07])add('sphere',[x+dx,y+.035+step,z+.285],[.028,.025,.055],C.claw);}
function whiskers(b,y){for(const side of [-1,1])for(const dy of [-.035,.035])b.segment([side*.18,y+dy,.84],[side*.55,y+dy*.3,1.03],.007,'#d8d1bf');}
export function creature(b,m,p,yaw=0,scale=1,time=0,walking=false,shine=false){
 const f=m.family,s=m.stage||0,body=shine?'#fff9db':FAMILIES[f].color,accent=shine?'#fff1a8':FAMILIES[f].accent;
 const size=scale*(1+s*.24),stride=walking?Math.sin(time*8.5):0,hop=walking?Math.abs(stride)*.075:Math.sin(time*2.6)*.025;
 b.frame(p,yaw,size);b.add('sphere',[0,.018,0],[.68,.012,.50],'#2f4c42');
 const add=(g,p,z,c,r)=>b.add(g,[p[0],p[1]+hop,p[2]],z,c,r);
 const ball=(p,z,c,r)=>add('sphere',p,z,c,r);
 const headY=f===4?.93:1.08;
 paw(add,-.34,.06,.31,f===4?accent:body,walking,time,0);paw(add,.34,.06,.31,f===4?accent:body,walking,time,Math.PI);paw(add,-.34,.06,-.26,f===4?accent:body,walking,time,Math.PI);paw(add,.34,.06,-.26,f===4?accent:body,walking,time,0);
 ball([0,.64,0],[.54,.58,.63],body);ball([0,.60,.45],[.37,.39,.20],f===4?'#7f899e':C.cream);
 ball([0,headY,.42],[.48,.43,.45],body);ball([0,headY-.14,.78],[.29,.21,.20],C.cream);ball([0,headY-.03,.92],[.095,.066,.055],C.dark);ball([-.055,headY-.005,.965],[.016,.013,.008],'#141d20');ball([.055,headY-.005,.965],[.016,.013,.008],'#141d20');
 eye(add,-1,headY,shine);eye(add,1,headY,shine);whiskers(b,headY-.11);
 for(const side of [-1,1])ball([side*.235,headY-.08,.75],[.09,.055,.025],f===3?'#d98466':C.pink);
 const breathe=1+Math.sin(time*2.1)*.018;ball([0,.69,-.05],[.39*breathe,.38*breathe,.38*breathe],body);
 if(f===0){
  for(const side of [-1,1]){add('cone',[side*.35,headY+.48,.39],[.20,.40,.19],body,[0,0,-side*.27]);add('cone',[side*.35,headY+.48,.54],[.12,.28,.028],'#a34f51',[0,0,-side*.27]);}
  const tailSwing=Math.sin(time*3.3)*.18;b.segment([0,.45,-.42],[.22,.82,-1.02],.13,body);ball([.23,1.02,-1.11],[.18,.37,.19],'#ef6541',[0,tailSwing,Math.sin(time*6)*.14]);ball([.23,.98,-1.21],[.10,.24,.11],'#ffe29b');
  if(s>=1){for(let i=0;i<5;i++)add('cone',[(i-2)*.14,headY+.43+Math.abs(i-2)*.03,.48],[.09,.20,.12],'#dc6141',[0,0,(i-2)*-.2]);ball([0,.72,.61],[.24,.05,.16],'#f1c278');}
  if(s===2){for(const side of [-1,1]){ball([side*.70,1.04,-.19],[.61,.07,.55],'#be554c',[.2,0,side*(.33+Math.sin(time*2)*.08)]);b.segment([side*.40,.88,-.20],[side*1.35,1.52,-.36],.06,'#ea9e59');add('cone',[side*.35,1.95,.26],[.08,.30,.10],C.cream,[0,0,-side*.32]);}}
 }else if(f===1){
  for(const side of [-1,1]){ball([side*.32,1.72,.34],[.19,.65,.13],body,[.08,0,-side*.22]);ball([side*.32,1.73,.455],[.082,.44,.025],'#c5eaa2',[.08,0,-side*.22]);}ball([0,.52,-.57],[.27,.29,.26],'#d9e7b1');
  for(let i=0;i<3;i++)ball([(i-1)*.18,.77,.54],[.09,.045,.07],'#8d6d4f');
  if(s>=1){for(let i=0;i<6;i++){const a=i/6*Math.PI*2;ball([Math.cos(a)*.24,1.50+Math.sin(a)*.08,.55],[.15,.08,.18],s===1?'#f4becb':'#f3bb7b',[.3,a,0]);}ball([0,1.58,.57],[.12,.09,.11],'#ffe69c');}
  if(s===2){for(const side of [-1,1]){b.segment([side*.3,1.3,.42],[side*.78,1.94,.45],.07,'#816849');b.segment([side*.64,1.79,.45],[side*.85,1.79,.58],.045,'#816849');ball([side*.8,1.9,.45],[.2,.12,.28],'#84bb67');}ball([0,.87,-.28],[.65,.18,.48],'#6da15c');}
 }else if(f===2){
  for(const side of [-1,1]){for(let i=0;i<3;i++)ball([side*(.47+i*.04),1.11+(i-1)*.17,.36],[.24,.08,.16],'#a0ded8',[0,0,side*(i-1)*.45]);ball([side*.42,.35,-.08],[.25,.10,.39],body,[0,side*.3,0]);}
  ball([0,.52,-.73],[.21,.19,.46],body,[.2,0,0]);ball([0,.67,-1.01],[.35,.075,.25],accent);ball([0,.80,.68],[.10,.045,.06],'#d6f7ef');
  if(s>=1){ball([0,.79,-.22],[.5,.43,.53],'#518dab');for(let i=0;i<3;i++)add('cone',[0,1.03-i*.08,-i*.24],[.17,.32,.16],accent,[.25,0,0]);}
  if(s===2){for(const side of [-1,1]){ball([side*.65,.7,-.3],[.55,.07,.34],body,[.1,0,side*.32]);add('cone',[side*.34,1.58,.35],[.1,.4,.11],accent,[0,0,-side*.3]);}}
 }else if(f===3){
  for(const side of [-1,1]){add('cone',[side*.34,1.65,.39],[.19,.53,.16],body,[0,0,-side*.27]);add('cone',[side*.40,1.98,.39],[.12,.2,.12],accent,[0,0,-side*.27]);}
  const tail=Math.sin(time*2.8)*.16;b.segment([0,.4,-.45],[.32,.65,-.86],.16,body);b.segment([.32,.65,-.86],[.12+tail,1.1,-1.06],.18,body);ball([.12+tail,1.15,-1.11],[.32,.35,.2],accent,[0,0,.4]);
  if(s>=1){for(let i=0;i<6;i++){const a=i/6*Math.PI*2;ball([Math.cos(a)*.37,.99+Math.sin(a)*.28,.4],[.18,.16,.22],C.cream);}}
  if(s===2){for(const side of [-1,1]){b.segment([side*.45,.7,-.18],[side*.8,1.5,-.44],.075,accent);ball([side*.86,1.29,-.36],[.43,.09,.40],body,[0,.3,side*.55]);}}
 }else{
  ball([0,.83,-.14],[.61,.43,.6],'#7f899e');for(let i=0;i<3+s;i++){add('gem',[(i%2?-.25:.25),1.07+(i%3)*.12,-.45+i*.19],[.14,.43,.15],accent,[.2,0,i%2?.2:-.2]);}add('cone',[0,1.15,.90],[.15,.34,.17],accent,[.65,0,0]);for(const side of [-1,1])add('cone',[side*.37,1.27,.27],[.16,.26,.15],body,[0,0,-side*.4]);if(s===2)for(const side of [-1,1])add('gem',[side*.6,.72,-.03],[.23,.53,.28],accent,[0,0,-side*.35]);
 }
 if(s>=1){for(const side of [-1,1])ball([side*.33,.47,.31],[.055,.035,.025],accent);}
 b.frame();
}
export function trainer(b,p,yaw,time,moving){b.frame(p,yaw,.95);b.add('sphere',[0,.02,0],[.40,.012,.3],'#2f4b41');const step=moving?Math.sin(time*10)*.23:0;for(const side of [-1,1]){b.add('cylinder',[side*.13,.36,step*side],[.11,.28,.12],'#384f57',[step*side,0,0]);b.add('sphere',[side*.14,.12,.09+step*side],[.13,.12,.22],'#e7dac1');b.add('cylinder',[side*.33,.82,-step*side*.5],[.09,.23,.1],'#e8a982',[step*side,0,-side*.12]);b.add('sphere',[side*.36,.58,-step*side*.55],[.10,.11,.10],'#efb58d');}b.add('sphere',[0,.82,0],[.28,.4,.2],'#e99b69');b.add('sphere',[0,.91,-.22],[.23,.27,.13],'#526c65');b.add('sphere',[0,1.43,.02],[.26,.3,.24],'#efb58d');b.add('sphere',[0,1.62,0],[.29,.19,.27],'#f0dec2');b.add('sphere',[0,1.58,.22],[.3,.035,.27],'#60847c');for(const side of [-1,1]){b.add('sphere',[side*.1,1.43,.247],[.022,.038,.015],'#374b4e');b.add('sphere',[side*.1,1.47,.263],[.007,.011,.006],'#fff');}b.add('sphere',[0,1.34,.25],[.035,.018,.015],'#b96f67');b.frame();}
