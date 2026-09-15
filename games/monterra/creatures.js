import {FAMILIES} from './core.js';
const C={cream:'#fff1d5',dark:'#283b43',white:'#fffdf3',pink:'#f0a6a1'};
export function creature(b,m,p,yaw=0,scale=1,time=0,walking=false,shine=false){
 const f=m.family,s=m.stage||0,body=shine?'#fff9db':FAMILIES[f].color,accent=shine?'#fff1a8':FAMILIES[f].accent;
 const size=scale*(1+s*.24),hop=walking?Math.abs(Math.sin(time*9))*.1:Math.sin(time*2.6)*.027;
 b.frame(p,yaw,size);b.add('sphere',[0,.025,0],[.65,.015,.48],'#416552');
 const add=(g,p,z,c,r)=>b.add(g,[p[0],p[1]+hop,p[2]],z,c,r);
 const ball=(p,z,c,r)=>add('sphere',p,z,c,r);
 const headY=f===4?.91:1.08;
 // Four independently animated feet, belly, and a expressive forward-facing head.
 for(let i=0;i<4;i++){const side=i%2?1:-1,front=i<2,step=walking?Math.sin(time*9+(i===0||i===3?0:Math.PI))*.09:0;ball([side*.34,.22+step,front?.30:-.34],[.17,.26,.24],f===4?accent:body);ball([side*.35,.1+step,front?.43:-.23],[.18,.11,.2],f===0||f===1?C.cream:body);}
 ball([0,.64,0],[.53,.59,.60],body);ball([0,.61,.46],[.36,.40,.20],f===4?'#7f899e':C.cream);
 ball([0,headY,.43],[.47,.43,.44],body);ball([0,headY-.14,.78],[.28,.21,.19],C.cream);ball([0,headY-.02,.925],[.09,.065,.05],C.dark);
 for(const side of [-1,1]){ball([side*.247,headY+.06,.791],[.116,.153,.052],C.white);ball([side*.247,headY+.06,.833],[.062,.09,.028],C.dark);ball([side*.23,headY+.105,.859],[.023,.032,.01],C.white);ball([side*.37,headY-.08,.742],[.09,.055,.025],f===3?'#d98466':C.pink);}
 if(f===0){
  for(const side of [-1,1]){add('cone',[side*.35,headY+.47,.4],[.2,.39,.19],body,[0,0,-side*.27]);add('cone',[side*.35,headY+.48,.55],[.12,.27,.028],'#a34f51',[0,0,-side*.27]);}
  b.segment([0,.45,-.42],[.23,.82,-1.03],.13,body);ball([.24,1.03,-1.1],[.18,.37,.19],'#ef6541',[0,0,Math.sin(time*6)*.14]);ball([.24,.98,-1.2],[.10,.24,.11],'#ffe29b');
  if(s>=1){for(let i=0;i<5;i++)add('cone',[(i-2)*.14,headY+.43+Math.abs(i-2)*.03,.48],[.09,.20,.12],'#dc6141',[0,0,(i-2)*-.2]);}
  if(s===2){for(const side of [-1,1]){ball([side*.7,1.04,-.19],[.61,.07,.55],'#be554c',[.2,0,side*(.33+Math.sin(time*2)*.08)]);b.segment([side*.40,.88,-.20],[side*1.35,1.52,-.36],.06,'#ea9e59');add('cone',[side*.35,1.95,.26],[.08,.30,.10],C.cream,[0,0,-side*.32]);}}
 }else if(f===1){
  for(const side of [-1,1]){ball([side*.32,1.72,.34],[.19,.65,.13],body,[.08,0,-side*.22]);ball([side*.32,1.73,.455],[.082,.44,.025],'#c5eaa2',[.08,0,-side*.22]);}ball([0,.52,-.57],[.27,.29,.26],'#d9e7b1');
  if(s>=1){for(let i=0;i<6;i++){const a=i/6*Math.PI*2;ball([Math.cos(a)*.24,1.5+Math.sin(a)*.08,.55],[.15,.08,.18],s===1?'#f4becb':'#f3bb7b',[.3,a,0]);}ball([0,1.58,.57],[.12,.09,.11],'#ffe69c');}
  if(s===2){for(const side of [-1,1]){b.segment([side*.3,1.3,.42],[side*.78,1.94,.45],.07,'#816849');b.segment([side*.64,1.79,.45],[side*.85,1.79,.58],.045,'#816849');ball([side*.8,1.9,.45],[.2,.12,.28],'#84bb67');}ball([0,.87,-.28],[.65,.18,.48],'#6da15c');}
 }else if(f===2){
  for(const side of [-1,1]){for(let i=0;i<3;i++)ball([side*(.47+i*.04),1.11+(i-1)*.17,.36],[.24,.08,.16],'#a0ded8',[0,0,side*(i-1)*.45]);ball([side*.42,.35,-.08],[.25,.10,.39],body,[0,side*.3,0]);}
  ball([0,.52,-.73],[.21,.19,.46],body,[.2,0,0]);ball([0,.67,-1.01],[.35,.075,.25],accent);
  if(s>=1){ball([0,.79,-.22],[.5,.43,.53],'#518dab');for(let i=0;i<3;i++)add('cone',[0,1.03-i*.08,-i*.24],[.17,.32,.16],accent,[.25,0,0]);}
  if(s===2){for(const side of [-1,1]){ball([side*.65,.7,-.3],[.55,.07,.34],body,[.1,0,side*.32]);add('cone',[side*.34,1.58,.35],[.1,.4,.11],accent,[0,0,-side*.3]);}}
 }else if(f===3){
  for(const side of [-1,1]){add('cone',[side*.34,1.65,.39],[.19,.53,.16],body,[0,0,-side*.27]);add('cone',[side*.40,1.98,.39],[.12,.2,.12],accent,[0,0,-side*.27]);}
  b.segment([0,.4,-.45],[.32,.65,-.86],.16,body);b.segment([.32,.65,-.86],[.12,1.1,-1.06],.18,body);ball([.12,1.15,-1.11],[.32,.35,.2],accent,[0,0,.4]);
  if(s>=1){for(let i=0;i<6;i++){const a=i/6*Math.PI*2;ball([Math.cos(a)*.37,.99+Math.sin(a)*.28,.4],[.18,.16,.22],C.cream);}}
  if(s===2){for(const side of [-1,1]){b.segment([side*.45,.7,-.18],[side*.8,1.5,-.44],.075,accent);ball([side*.86,1.29,-.36],[.43,.09,.40],body,[0,.3,side*.55]);}}
 }else{
  ball([0,.83,-.14],[.61,.43,.6],'#7f899e');for(let i=0;i<3+s;i++){add('gem',[(i%2?-.25:.25),1.07+(i%3)*.12,-.45+i*.19],[.14,.43,.15],accent,[.2,0,i%2?.2:-.2]);}add('cone',[0,1.15,.90],[.15,.34,.17],accent,[.65,0,0]);for(const side of [-1,1])add('cone',[side*.37,1.27,.27],[.16,.26,.15],body,[0,0,-side*.4]);if(s===2)for(const side of [-1,1])add('gem',[side*.6,.72,-.03],[.23,.53,.28],accent,[0,0,-side*.35]);
 }
 b.frame();
}
export function trainer(b,p,yaw,time,moving){b.frame(p,yaw,.95);b.add('sphere',[0,.02,0],[.40,.012,.3],'#3d604c');const step=moving?Math.sin(time*10)*.23:0;for(const side of [-1,1]){b.add('cylinder',[side*.13,.36,step*side],[.11,.28,.12],'#384f57',[step*side,0,0]);b.add('sphere',[side*.14,.12,.09+step*side],[.13,.12,.22],'#e7dac1');b.add('cylinder',[side*.33,.82,-step*side*.5],[.09,.23,.1],'#e8a982',[step*side,0,-side*.12]);}b.add('sphere',[0,.82,0],[.28,.4,.2],'#e99b69');b.add('sphere',[0,.91,-.22],[.23,.27,.13],'#526c65');b.add('sphere',[0,1.43,.02],[.26,.3,.24],'#efb58d');b.add('sphere',[0,1.62,0],[.29,.19,.27],'#f0dec2');b.add('sphere',[0,1.58,.22],[.3,.035,.27],'#60847c');for(const side of [-1,1])b.add('sphere',[side*.1,1.43,.247],[.022,.038,.015],'#374b4e');b.frame();}
