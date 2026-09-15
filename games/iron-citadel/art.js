import { castRay, clamp } from './engine.js';

function canvas(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
function rect(g,color,...box){g.fillStyle=color;g.fillRect(...box);}
function texture(type){
  const c=canvas(64,64),g=c.getContext('2d');
  const colors=type===2?['#485966','#5e6f77','#2d3c49']:type===3?['#785049','#916254','#493435']:['#947258','#b1916a','#51473c'];
  rect(g,colors[0],0,0,64,64);
  let seed=type*733;
  for(let y=0;y<64;y+=16)for(let x=-32;x<64;x+=32){
    const xx=x+(y%32?16:0);rect(g,colors[2],xx,y,32,16);rect(g,colors[0],xx+1,y+1,30,14);rect(g,colors[1],xx+2,y+1,29,1);
    for(let i=0;i<20;i++){seed=(seed*1664525+1013904223)>>>0;const px=xx+2+(seed%28),py=y+3+((seed>>>8)%10);g.fillStyle=i%2?'#ffffff0c':'#00000015';g.fillRect(px,py,2,1);}
  }
  if(type===4||type===5){
    rect(g,'#1d272c',0,0,64,64);rect(g,type===5?'#8f682e':'#677779',5,2,54,62);
    for(let x=8;x<60;x+=8){rect(g,type===5?'#bc9448':'#85918a',x,4,1,58);rect(g,'#252e2b',x+5,4,2,58);}
    rect(g,'#192724',6,22,52,18);rect(g,type===5?'#f5c35d':'#a8c7b2',10,26,44,10);
    g.fillStyle='#26322a';g.font='bold 8px monospace';g.textAlign='center';g.fillText(type===5?'EXIT':'OPEN',32,34);
    rect(g,'#131b20',47,44,8,10);rect(g,type===5?'#f8ce69':'#9dedcb',49,46,4,4);
    for(const x of [3,60])for(const y of [4,58])rect(g,'#b9b9a4',x,y,2,2);
  }
  return c;
}

function guard(type,frame,charging=false){
  const c=canvas(48,64),g=c.getContext('2d');
  const boss=type==='boss',scout=type==='scout',main=boss?'#78524e':scout?'#627d7d':'#73736b',light=boss?'#b28572':scout?'#a3bebb':'#b6b4a0';
  const dark='#252c30',visor=charging?'#ffe69a':boss?'#ff624d':scout?'#72e5e0':'#ffad69';
  const step=frame?2:0;
  rect(g,'#080f1477',7,59,36,4);
  rect(g,dark,13,42,10,17-step);rect(g,dark,28,42,9,17+step);
  rect(g,main,14,44,7,9-step);rect(g,main,29,44,6,9+step);
  rect(g,'#151d24',10,56-step,13,5);rect(g,'#151d24',28,56+step,13,5);
  rect(g,dark,11,19,29,26);rect(g,main,13,21,25,21);rect(g,light,13,21,25,3);
  rect(g,'#414b4c',16,28,20,10);rect(g,light,17,29,3,7);rect(g,'#ccad79',23,28,5,4);
  rect(g,dark,6,21,8,19);rect(g,main,7,22,7,12);rect(g,light,7,22,7,3);
  rect(g,dark,37,20,8,20);rect(g,main,38,22,6,12);rect(g,light,38,22,6,3);
  rect(g,dark,15,4,22,18);rect(g,main,17,3,18,7);rect(g,light,18,3,16,2);
  rect(g,'#131c24',16,10,20,8);rect(g,visor,17,11,17,3);rect(g,'#f8e4b4',18,11,3,1);
  rect(g,main,20,16,12,7);rect(g,dark,22,18,8,2);
  rect(g,'#171f27',9,33,29,8);rect(g,'#929890',11,32,20,3);rect(g,'#3c484b',30,30,9,13);
  rect(g,'#111820',31,31,7,5);rect(g,'#071316',33,32,3,3);
  rect(g,light,16,38,6,4);rect(g,light,37,36,5,5);
  if(boss){rect(g,'#ac7160',4,17,11,6);rect(g,'#ac7160',36,17,11,6);rect(g,'#edb76d',22,5,9,3);rect(g,'#fb8054',23,32,5,5);}
  if(charging){rect(g,'#fff0a9',32,27,5,5);rect(g,'#ffac62',30,29,9,2);}
  return c;
}

function itemSprite(type){
  const c=canvas(48,64),g=c.getContext('2d');
  rect(g,'#08121b55',10,57,28,4);
  if(type==='health'){
    rect(g,'#293d3b',10,35,28,22);rect(g,'#c4c5a0',11,34,26,20);rect(g,'#f2edc9',12,34,24,4);rect(g,'#555f4c',20,30,11,4);rect(g,'#527d65',22,38,6,12);rect(g,'#527d65',19,41,12,6);
  }else if(type==='key'){
    rect(g,'#af7434',10,29,15,15);rect(g,'#ffe58f',10,27,15,13);rect(g,'#6b542e',14,31,7,5);rect(g,'#ffd572',22,34,17,5);rect(g,'#ffd572',30,38,4,6);rect(g,'#ffd572',36,38,4,4);
  }else if(type==='treasure'){
    rect(g,'#836344',11,42,27,13);rect(g,'#f3c477',11,39,27,12);rect(g,'#ffdfa0',14,36,21,5);rect(g,'#a57b37',20,39,3,12);rect(g,'#fff0b8',14,38,18,1);
  }else if(type==='rifle'){
    rect(g,'#867b52',6,46,37,10);rect(g,'#bac3b0',8,38,32,7);rect(g,'#31424a',27,40,17,5);rect(g,'#26333c',14,44,5,9);rect(g,'#f1c879',10,39,4,2);rect(g,'#d6d8bd',21,34,3,4);
  }else{
    rect(g,'#384b41',13,36,24,21);rect(g,'#6b8465',14,36,22,18);rect(g,'#afbea0',14,36,22,3);for(let x=17;x<35;x+=6){rect(g,'#edd49b',x,43,3,8);rect(g,'#9c8056',x,41,3,2);}
  }
  return c;
}

export class Renderer {
  constructor(target,hud){
    this.canvas=target;this.hud=hud;this.ctx=target.getContext('2d',{alpha:false});
    this.textures=[null,...[1,2,3,4,5].map(texture)];this.sprites={};
    for(const t of ['guard','scout','boss'])this.sprites[t]=[guard(t,0),guard(t,1),guard(t,0,true)];
    for(const t of ['health','key','treasure','ammo','rifle'])this.sprites[t]=itemSprite(t);
    this.resize();
  }
  resize(){
    const r=this.canvas.getBoundingClientRect(),w=r.width<500?320:480,h=Math.max(180,Math.round(w*r.height/Math.max(1,r.width)));
    this.canvas.width=w;this.canvas.height=Math.min(720,h);this.ctx.imageSmoothingEnabled=false;this.depth=new Float32Array(w);this.floor=this.ctx.createImageData(w,this.canvas.height);this.pixels=new Uint32Array(this.floor.data.buffer);
    this.bottomInset=this.hud?parseFloat(getComputedStyle(this.hud).height)/Math.max(1,r.height)*this.canvas.height:0;
  }
  render(game,now=0){
    const g=this.ctx,w=this.canvas.width,h=this.canvas.height,p=game.player,horizon=Math.floor(h*.48),focal=Math.max(w/1.44,h*.72);
    const plane=w/(2*focal),dx=Math.cos(p.a),dy=Math.sin(p.a),px=-dy*plane,py=dx*plane;
    for(let y=0;y<h;y++){
      const below=y>horizon,dist=focal*.5/Math.max(1,Math.abs(y-horizon)),shade=Math.max(.16,1/(1+dist*.14));
      let wx=p.x+dist*(dx+px*-1),wy=p.y+dist*(dy+py*-1);
      const sx=dist*px*2/w,sy=dist*py*2/w;
      for(let x=0;x<w;x++){
        const ix=Math.floor(wx*32),iy=Math.floor(wy*32),seam=(ix&31)<1||(iy&31)<1;
        const noise=((ix*13^iy*7)&7),checker=(Math.floor(wx)+Math.floor(wy))&1;
        let r=below?61+checker*7:40,b=below?47:43,green=below?57+checker*5:43;
        if(seam){r-=18;green-=18;b-=14;}r=(r+noise)*shade;green=(green+noise)*shade;b=(b+noise)*shade;
        this.pixels[y*w+x]=(255<<24)|((b|0)<<16)|((green|0)<<8)|(r|0);wx+=sx;wy+=sy;
      }
    }
    g.putImageData(this.floor,0,0);
    for(let x=0;x<w;x++){
      const camera=x/w*2-1,ray=castRay(game.level,p.x,p.y,dx+px*camera,dy+py*camera),height=focal/ray.depth,top=horizon-height/2;
      this.depth[x]=ray.depth;
      let tx=Math.floor(ray.u*64);if(ray.tile<4&&((!ray.side&&dx>0)||(ray.side&&dy<0)))tx=63-tx;
      g.drawImage(this.textures[ray.tile],tx,0,1,64,x,top,1,height);
      const darkness=clamp(ray.depth*.05+(ray.side?.15:0),0,.87);g.fillStyle=`rgba(9,15,21,${darkness})`;g.fillRect(x,top,1,height+1);
      if(ray.tile===4&&ray.door.opening){g.fillStyle=`rgba(138,190,159,${ray.door.open*.28})`;g.fillRect(x,top,1,height);}
    }
    const entities=[...game.level.enemies,...game.level.items.filter(i=>!i.taken)].map(e=>({e,d:Math.hypot(e.x-p.x,e.y-p.y)})).sort((a,b)=>b.d-a.d);
    for(const {e} of entities){
      const rx=e.x-p.x,ry=e.y-p.y,z=rx*dx+ry*dy;if(z<.15)continue;
      const horizontal=-rx*dy+ry*dx,screen=w/2+horizontal/z*focal,isEnemy='hp'in e,boss=e.type==='boss';
      const scale=boss?1.35:1,sh=focal/z*scale,sw=sh*.75,left=Math.floor(screen-sw/2),bottom=horizon+focal/z/2;
      if(left>=w||left+sw<0)continue;
      if(isEnemy&&e.hp<=0){
        const sy=bottom-4/z,ww=sw*.8;for(let x=Math.max(0,Math.floor(screen-ww/2));x<Math.min(w,screen+ww/2);x++){if(z>=this.depth[x])continue;g.fillStyle='#3b4240';g.fillRect(x,sy,1,Math.max(2,5/z));}continue;
      }
      const sprite=isEnemy?this.sprites[e.type][e.windup>0?2:Math.floor(e.walk||0)%2]:this.sprites[e.type],float=!isEnemy?Math.sin(now*2+e.x)*.025*sh:0;
      for(let x=Math.max(0,left);x<Math.min(w,left+sw);x++){
        if(z>=this.depth[x])continue;
        const tx=clamp(Math.floor((x-left)/sw*48),0,47);g.drawImage(sprite,tx,0,1,64,x,bottom-sh+float,1,sh);
      }
      if(isEnemy&&e.hp<e.maxHp&&z<this.depth[clamp(Math.floor(screen),0,w-1)]&&z<8){g.fillStyle='#202a30';g.fillRect(screen-sw*.28,bottom-sh-5,sw*.56,2);g.fillStyle=boss?'#f6825f':'#dfc284';g.fillRect(screen-sw*.28,bottom-sh-5,sw*.56*e.hp/e.maxHp,2);}
    }
    this.weapon(game,now);
    const vignette=g.createRadialGradient(w/2,horizon,h*.15,w/2,horizon,Math.max(w,h)*.7);vignette.addColorStop(0,'#050b0f00');vignette.addColorStop(1,'#050b0f99');g.fillStyle=vignette;g.fillRect(0,0,w,h);
    if(game.hurt){g.fillStyle=`rgba(216,66,45,${game.hurt*.7})`;g.fillRect(0,0,w,h);}
  }
  weapon(game){
    const g=this.ctx,w=this.canvas.width,h=this.canvas.height,shoot=game.flash>0,reload=game.reloading>0,melee=game.player.weapon===2,rifle=game.player.weapon===1;
    const s=Math.min(w/220,h/155),bob=Math.sin(game.bob)*1.6,y=h-(game.phase==='menu'?0:this.bottomInset)-65*s+(reload?Math.sin(game.reloading/1.05*Math.PI)*32:0)*s+(shoot?5:0)*s;
    g.save();g.translate(Math.floor(w/2+Math.cos(game.bob*.5)*3),Math.floor(y+bob));g.scale(s,s);
    if(melee){
      rect(g,'#222e34',-14,20,28,53);rect(g,'#627c77',-12,20,23,48);rect(g,'#b6c7ad',-9,16,18,20);rect(g,shoot?'#e1ffe3':'#64bfc2',-6,7,4,16);rect(g,shoot?'#e1ffe3':'#64bfc2',4,7,4,16);rect(g,'#1f3037',-6,34,14,20);
      if(shoot){g.strokeStyle='#c2ffff';g.lineWidth=2;g.beginPath();g.moveTo(-4,9);g.lineTo(7,-7);g.lineTo(-4,-13);g.lineTo(3,-27);g.stroke();}
    }else{
      rect(g,'#25262b',-45,53,35,18);rect(g,'#827361',-41,52,28,16);rect(g,'#b1a087',-34,52,20,4);
      rect(g,'#272d31',15,47,27,22);rect(g,'#8b7c66',18,48,23,21);rect(g,'#c0b092',18,48,20,5);
      rect(g,'#14202a',-18,15,38,55);rect(g,'#45525a',-15,16,32,48);rect(g,'#85908c',-11,19,24,17);rect(g,'#b4b9a4',-10,19,23,3);
      rect(g,'#25343d',-9,-(rifle?9:0),20,32);rect(g,'#909b94',-6,-(rifle?8:0),14,25);rect(g,'#c1c8af',-5,-(rifle?8:0),2,26);
      rect(g,'#1a2832',-5,-(rifle?11:3),12,6);rect(g,'#19232b',-7,28,17,7);rect(g,'#101c25',-5,39,14,21);
      rect(g,'#87948b',-10,37,3,26);rect(g,'#607678',13,32,6,26);rect(g,'#e8c384',-3,30,3,2);rect(g,'#e8c384',5,30,3,2);
      if(rifle){rect(g,'#597270',-20,29,7,27);rect(g,'#b0bca7',-19,30,3,24);rect(g,'#262d34',16,15,11,9);rect(g,'#79c6bb',20,16,5,4);}
      if(shoot){
        g.fillStyle='#ffb94f';g.beginPath();g.moveTo(-2,-31);g.lineTo(4,-14);g.lineTo(19,-24);g.lineTo(11,-8);g.lineTo(25,0);g.lineTo(8,4);g.lineTo(-8,4);g.lineTo(-22,-7);g.lineTo(-7,-10);g.lineTo(-19,-25);g.closePath();g.fill();rect(g,'#fff1b1',-5,-12,12,15);rect(g,'#fffced',-2,-9,6,11);
      }
    }
    g.restore();
  }
  minimap(target,game,expanded=false){
    const c=target.getContext('2d'),n=game.level.spec.size,size=expanded?220:112,unit=size/n;
    if(target.width!==size){target.width=size;target.height=size;}
    c.clearRect(0,0,size,size);c.fillStyle='#0e1923e8';c.fillRect(0,0,size,size);
    for(let y=0;y<n;y++)for(let x=0;x<n;x++)if(game.level.seen[y][x]){
      const t=game.level.grid[y][x];c.fillStyle=t===5?'#f3c775':t===4?'#81aaa1':t?'#64716c':'#263942';c.fillRect(x*unit,y*unit,Math.ceil(unit)-.5,Math.ceil(unit)-.5);
    }
    for(const e of game.level.items)if(!e.taken&&e.type==='key'&&game.level.seen[Math.floor(e.y)][Math.floor(e.x)]){c.fillStyle='#ffe19d';c.fillRect(e.x*unit-2,e.y*unit-2,4,4);}
    const p=game.player;c.save();c.translate(p.x*unit,p.y*unit);c.rotate(p.a);c.fillStyle='#f5dfb3';c.beginPath();c.moveTo(5,0);c.lineTo(-3,-3);c.lineTo(-2,0);c.lineTo(-3,3);c.closePath();c.fill();c.restore();
  }
}
