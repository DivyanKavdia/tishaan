import {FAMILIES} from './core.js';
const C={cream:'#efe5cf',dark:'#17262c',white:'#fffdf3',pink:'#d78d86',claw:'#d8cfbc',shadow:'#18312d'};
function eye(add,side,y,shine=false){
  add('sphere',[side*.255,y+.055,.805],[.098,.128,.043],C.white);
  add('sphere',[side*.255,y+.052,.838],[.052,.074,.023],shine?'#6a5c25':C.dark);
  add('sphere',[side*.245,y+.085,.859],[.014,.019,.007],C.white);
}
function paw(add,x,y,z,body,walking,time,phase=0){
  const swing=walking?Math.sin(time*8.5+phase):0;
  const lift=walking?Math.max(0,swing)*.075:0;
  const reach=walking?swing*.045:0;
  add('sphere',[x,y+.15+lift,z+reach],[.165,.215,.205],body);
  add('sphere',[x,y+.055+lift,z+.115+reach],[.18,.078,.215],C.cream);
  for(const dx of [-.066,0,.066])add('sphere',[x+dx,y+.035+lift,z+.27+reach],[.022,.018,.045],C.claw);
}
function whiskers(b,y){for(const side of [-1,1])for(const dy of [-.035,.035])b.segment([side*.17,y+dy,.82],[side*.49,y+dy*.4,1.01],.005,'#cfc8b8');}
function ear(add,x,y,z,body,inner,tilt=0){add('cone',[x,y,z],[.16,.42,.13],body,[0,0,tilt]);add('cone',[x,y-.01,z+.055],[.085,.285,.028],inner,[0,0,tilt]);}
function shoulder(add,x,y,z,body){add('sphere',[x,y,z],[.28,.34,.31],body);}
function chest(add,y,body,accent){add('sphere',[0,y,.28],[.34,.42,.25],body);add('sphere',[0,y-.03,.47],[.23,.28,.08],accent);}

export function creature(b,m,p,yaw=0,scale=1,time=0,walking=false,shine=false){
  const f=m.family,s=m.stage||0,body=shine?'#f3e9be':FAMILIES[f].color,accent=shine?'#e6d17f':FAMILIES[f].accent;
  const size=scale*(1+s*.22),stride=walking?Math.sin(time*8.2):0,hop=walking?Math.max(0,Math.sin(time*8.2))*0.035:Math.sin(time*2.15)*.012;
  const breathe=1+Math.sin(time*2.05)*.012;
  b.frame(p,yaw,size);
  b.add('sphere',[0,.018,0],[.76,.010,.57],C.shadow);
  b.add('sphere',[0,.022,.05],[.55,.007,.38],'#203c37');
  const add=(g,p,z,c,r)=>b.add(g,[p[0],p[1]+hop,p[2]],z,c,r);
  const ball=(p,z,c,r)=>add('sphere',p,z,c,r);
  const headY=f===4?.96:1.09;

  paw(add,-.34,.055,.29,body,walking,time,0);
  paw(add,.34,.055,.29,body,walking,time,Math.PI);
  paw(add,-.33,.055,-.27,body,walking,time,Math.PI);
  paw(add,.33,.055,-.27,body,walking,time,0);
  shoulder(add,-.31,.48,.08,body);shoulder(add,.31,.48,.08,body);
  ball([0,.63,-.03],[.55*breathe,.56*breathe,.66*breathe],body);
  ball([0,.60,.43],[.35,.36,.18],f===4?'#737d8b':C.cream);
  chest(add,.73,body,f===2?'#dff4eb':C.cream);

  ball([0,headY,.40],[.46,.42,.43],body);
  ball([0,headY-.15,.74],[.28,.19,.20],C.cream);
  ball([0,headY-.055,.90],[.083,.057,.051],C.dark);
  ball([-.047,headY-.035,.94],[.012,.010,.007],'#10171a');
  ball([.047,headY-.035,.94],[.012,.010,.007],'#10171a');
  eye(add,-1,headY,shine);eye(add,1,headY,shine);whiskers(b,headY-.12);
  for(const side of [-1,1])ball([side*.23,headY-.11,.73],[.065,.038,.022],f===3?'#b76b58':C.pink);

  if(f===0){
    for(const side of [-1,1])ear(add,side*.34,headY+.44,.38,body,'#8f4544',-side*.22);
    const tailSwing=Math.sin(time*3.0)*.14;
    b.segment([0,.46,-.46],[.20,.73,-.94],.115,body);
    b.segment([.20,.73,-.94],[.25+tailSwing,.95,-1.10],.10,body);
    ball([.25+tailSwing,1.02,-1.15],[.16,.31,.16],'#d85839',[0,tailSwing,Math.sin(time*5.2)*.10]);
    ball([.25+tailSwing,.99,-1.23],[.085,.19,.09],'#f4d38d');
    if(s>=1){for(let i=0;i<5;i++)add('cone',[(i-2)*.13,headY+.40+Math.abs(i-2)*.025,.45],[.075,.17,.10],'#b94e3b',[0,0,(i-2)*-.16]);ball([0,.73,.59],[.22,.035,.15],'#ddb36f');}
    if(s===2){for(const side of [-1,1]){ball([side*.67,1.03,-.18],[.59,.055,.50],'#a8453e',[.18,0,side*(.28+Math.sin(time*2)*.06)]);b.segment([side*.39,.87,-.18],[side*1.29,1.47,-.33],.05,'#d4874b');add('cone',[side*.34,1.88,.25],[.065,.26,.09],C.cream,[0,0,-side*.3]);}}
  }else if(f===1){
    for(const side of [-1,1]){ball([side*.31,1.65,.34],[.17,.57,.11],body,[.08,0,-side*.18]);ball([side*.31,1.66,.445],[.07,.38,.02],'#b7d88f',[.08,0,-side*.18]);}
    ball([0,.51,-.57],[.25,.27,.24],'#c9d8a6');
    for(let i=0;i<3;i++)ball([(i-1)*.17,.77,.54],[.075,.035,.06],'#765c43');
    if(s>=1){for(let i=0;i<6;i++){const a=i/6*Math.PI*2;ball([Math.cos(a)*.23,1.48+Math.sin(a)*.075,.55],[.135,.07,.16],s===1?'#dfabb6':'#dea76d',[.3,a,0]);}ball([0,1.55,.57],[.105,.08,.10],'#efd58d');}
    if(s===2){for(const side of [-1,1]){b.segment([side*.29,1.28,.42],[side*.74,1.86,.45],.055,'#6e583e');b.segment([side*.61,1.72,.45],[side*.82,1.72,.57],.035,'#6e583e');ball([side*.78,1.82,.45],[.18,.10,.25],'#749e5b');}ball([0,.87,-.29],[.61,.15,.44],'#5d8c4c');}
  }else if(f===2){
    for(const side of [-1,1]){for(let i=0;i<3;i++)ball([side*(.45+i*.035),1.10+(i-1)*.16,.36],[.21,.065,.14],'#91cfc8',[0,0,side*(i-1)*.40]);ball([side*.41,.34,-.08],[.22,.08,.35],body,[0,side*.25,0]);}
    ball([0,.52,-.73],[.19,.17,.43],body,[.2,0,0]);ball([0,.67,-1.00],[.32,.055,.22],accent);ball([0,.79,.68],[.085,.032,.05],'#ccece4');
    if(s>=1){ball([0,.79,-.22],[.47,.40,.50],'#477d99');for(let i=0;i<3;i++)add('cone',[0,1.02-i*.08,-i*.23],[.14,.28,.14],accent,[.25,0,0]);}
    if(s===2){for(const side of [-1,1]){ball([side*.63,.69,-.3],[.52,.055,.31],body,[.1,0,side*.30]);add('cone',[side*.34,1.53,.35],[.085,.34,.10],accent,[0,0,-side*.28]);}}
  }else if(f===3){
    for(const side of [-1,1])ear(add,side*.34,1.62,.38,body,accent,-side*.24);
    const tail=Math.sin(time*2.6)*.14;
    b.segment([0,.41,-.45],[.30,.64,-.84],.14,body);b.segment([.30,.64,-.84],[.11+tail,1.05,-1.03],.16,body);ball([.11+tail,1.10,-1.08],[.29,.32,.18],accent,[0,0,.35]);
    if(s>=1){for(let i=0;i<6;i++){const a=i/6*Math.PI*2;ball([Math.cos(a)*.34,.99+Math.sin(a)*.25,.4],[.155,.14,.19],C.cream);}}
    if(s===2){for(const side of [-1,1]){b.segment([side*.43,.70,-.17],[side*.76,1.43,-.41],.062,accent);ball([side*.82,1.23,-.34],[.39,.07,.36],body,[0,.3,side*.5]);}}
  }else{
    ball([0,.82,-.15],[.58,.40,.57],'#717b89');
    for(let i=0;i<3+s;i++)add('gem',[(i%2?-.24:.24),1.04+(i%3)*.11,-.44+i*.18],[.12,.36,.13],accent,[.2,0,i%2?.18:-.18]);
    add('cone',[0,1.14,.88],[.13,.29,.15],accent,[.62,0,0]);
    for(const side of [-1,1])add('cone',[side*.36,1.25,.27],[.14,.23,.13],body,[0,0,-side*.37]);
    if(s===2)for(const side of [-1,1])add('gem',[side*.58,.72,-.03],[.20,.45,.24],accent,[0,0,-side*.32]);
  }

  if(s>=1){for(const side of [-1,1])ball([side*.32,.47,.31],[.045,.025,.02],accent);}
  b.frame();
}

export function trainer(b,p,yaw,time,moving){
  b.frame(p,yaw,.95);b.add('sphere',[0,.02,0],[.40,.012,.3],'#263f39');
  const step=moving?Math.sin(time*9.5)*.20:0;
  for(const side of [-1,1]){b.add('cylinder',[side*.13,.36,step*side],[.11,.28,.12],'#384f57',[step*side,0,0]);b.add('sphere',[side*.14,.12,.09+step*side],[.13,.12,.22],'#d8ccb6');b.add('cylinder',[side*.33,.82,-step*side*.5],[.09,.23,.1],'#d99a75',[step*side,0,-side*.12]);b.add('sphere',[side*.36,.58,-step*side*.55],[.10,.11,.10],'#e0a682');}
  b.add('sphere',[0,.82,0],[.28,.4,.2],'#d7895d');b.add('sphere',[0,.91,-.22],[.23,.27,.13],'#526c65');b.add('sphere',[0,1.43,.02],[.26,.3,.24],'#e0a682');b.add('sphere',[0,1.62,0],[.29,.19,.27],'#dfceb5');b.add('sphere',[0,1.58,.22],[.3,.035,.27],'#526f68');
  for(const side of [-1,1]){b.add('sphere',[side*.1,1.43,.247],[.020,.034,.014],'#2a3b3e');b.add('sphere',[side*.1,1.47,.263],[.006,.009,.005],'#fff');}
  b.add('sphere',[0,1.34,.25],[.032,.016,.014],'#a65f59');b.frame();
}
