import {vertex,fragment,shadowVertex,shadowFragment} from './shaders.js';
/* Lightweight, dependency-free WebGL renderer. Geometry is batched to limit mobile draw calls. */
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const mix = (a, b, t) => a + (b - a) * t;
export const norm = v => { const n = Math.hypot(...v) || 1; return v.map(x => x / n); };
const cross = (a,b) => [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const dot = (a,b) => a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
export function mul(a,b){ const r=new Float32Array(16); for(let j=0;j<4;j++)for(let i=0;i<4;i++)r[j*4+i]=a[i]*b[j*4]+a[4+i]*b[j*4+1]+a[8+i]*b[j*4+2]+a[12+i]*b[j*4+3];return r; }
function perspective(fov,aspect,n,f){const t=1/Math.tan(fov/2);return new Float32Array([t/aspect,0,0,0,0,t,0,0,0,0,(f+n)/(n-f),-1,0,0,2*f*n/(n-f),0]);}
function lookAt(eye,target){const z=norm(eye.map((v,i)=>v-target[i])),x=norm(cross([0,1,0],z)),y=cross(z,x);return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1]);}
export function color(hex){if(Array.isArray(hex))return hex;const c=parseInt(String(hex).replace('#',''),16);return [(c>>16&255)/255,(c>>8&255)/255,(c&255)/255];}
const cache=new Map();
let lowDetail=false;
function sphere(rx=10,ry=7){const v=[];function point(a,b){return [Math.sin(b)*Math.cos(a),Math.cos(b),Math.sin(b)*Math.sin(a)];}for(let y=0;y<ry;y++)for(let x=0;x<rx;x++){const a=x/rx*Math.PI*2,b=(x+1)/rx*Math.PI*2,c=y/ry*Math.PI,d=(y+1)/ry*Math.PI;for(const p of [point(a,c),point(a,d),point(b,d),point(a,c),point(b,d),point(b,c)])v.push(...p,...p);}return v;}
function cylinder(top=1,segments=9){const v=[];const tri=(a,b,c,n)=>{for(const p of [a,b,c])v.push(...p,...n);};for(let i=0;i<segments;i++){const a=i/segments*Math.PI*2,b=(i+1)/segments*Math.PI*2,A=[Math.cos(a),-1,Math.sin(a)],B=[Math.cos(b),-1,Math.sin(b)],C=[Math.cos(a)*top,1,Math.sin(a)*top],D=[Math.cos(b)*top,1,Math.sin(b)*top];tri(A,C,D,norm([Math.cos((a+b)/2),(1-top)/2,Math.sin((a+b)/2)]));tri(A,D,B,norm([Math.cos((a+b)/2),(1-top)/2,Math.sin((a+b)/2)]));tri([0,1,0],D,C,[0,1,0]);tri([0,-1,0],A,B,[0,-1,0]);}return v;}
function box(){const v=[];for(const [normal,corners] of [[[0,1,0],[[-1,1,-1],[-1,1,1],[1,1,1],[1,1,-1]]],[[0,-1,0],[[-1,-1,1],[-1,-1,-1],[1,-1,-1],[1,-1,1]]],[[1,0,0],[[1,-1,-1],[1,1,-1],[1,1,1],[1,-1,1]]],[[-1,0,0],[[-1,-1,1],[-1,1,1],[-1,1,-1],[-1,-1,-1]]],[[0,0,1],[[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]]],[[0,0,-1],[[1,-1,-1],[-1,-1,-1],[-1,1,-1],[1,1,-1]]]])for(const i of [0,1,2,0,2,3])v.push(...corners[i],...normal);return v;}
export function geo(name){if(!cache.has(name))cache.set(name,name==='box'?box():name==='cone'?cylinder(0):name==='cylinder'?cylinder():name==='gem'?sphere(6,3):name==='low'?sphere(lowDetail?5:7,lowDetail?3:5):sphere(lowDetail?6:10,lowDetail?4:7));return cache.get(name);}
export class Batch {
  constructor(){this.data=[];this.origin=[0,0,0];this.yaw=0;this.scale=1;}
  reset(){this.data.length=0;this.frame();}
  frame(p=[0,0,0],yaw=0,scale=1){this.origin=p;this.yaw=yaw;this.scale=scale;}
  triangle(a,b,c,hex){const n=norm(cross(b.map((v,i)=>v-a[i]),c.map((v,i)=>v-a[i]))),col=color(hex);for(const p of [a,b,c])this.data.push(...p,...n,...col);}
  add(name,pos,size,hex,rotation=[0,0,0]){
    const vertices=geo(name),col=color(hex),s=this.scale,O=this.origin;
    const [rx,ry,rz]=rotation,cx=Math.cos(rx),sx=Math.sin(rx),cy=Math.cos(ry),sy=Math.sin(ry),cz=Math.cos(rz),sz=Math.sin(rz),cw=Math.cos(this.yaw),sw=Math.sin(this.yaw);
    const rotate=(x,y,z)=>{let a=x*cz-y*sz,b=x*sz+y*cz,c=z;let d=b*cx-c*sx,e=b*sx+c*cx;return [a*cy+e*sy,d,-a*sy+e*cy];};
    for(let i=0;i<vertices.length;i+=6){const p=rotate(vertices[i]*size[0],vertices[i+1]*size[1],vertices[i+2]*size[2]),n=norm(rotate(vertices[i+3]/(size[0]||1),vertices[i+4]/(size[1]||1),vertices[i+5]/(size[2]||1)));const px=p[0]+pos[0],py=p[1]+pos[1],pz=p[2]+pos[2];this.data.push(O[0]+(px*cw+pz*sw)*s,O[1]+py*s,O[2]+(-px*sw+pz*cw)*s,n[0]*cw+n[2]*sw,n[1],-n[0]*sw+n[2]*cw,...col);}
  }
  segment(a,b,width,hex,shape='cylinder'){const d=b.map((v,i)=>v-a[i]),length=Math.hypot(...d),yaw=Math.atan2(d[0],d[2]),pitch=Math.acos(clamp(d[1]/(length||1),-1,1));this.add(shape,a.map((v,i)=>(v+b[i])/2),[width,length/2,width],hex,[pitch,yaw,0]);}
}
export class Renderer {
  constructor(canvas,options={}){
    this.options=options;this.fov=options.fov||.68;this.fog=options.fog||[.54,.65,.68];this.sun=options.sun||[-.5,.85,.45];this.exposure=options.exposure||1.1;this.lightColor=options.lightColor||[1.,.9,.73];this.fogNear=options.fogNear||35;this.fogFar=options.fogFar||105;
    this.canvas=canvas;this.gl=canvas.getContext('webgl',{alpha:false,antialias:true,powerPreference:'high-performance'});
    if(!this.gl){
      // Preserve the same 3D geometry and controls when a browser disables WebGL.
      this.software=true;lowDetail=true;cache.clear();this.ctx=canvas.getContext('2d',{alpha:false});
      if(!this.ctx)throw new Error('This browser could not start the graphics canvas. Try Safari or Chrome.');
      this.eye=[14,18,25];this.target=[0,0,0];this.staticData=[];this.resize();return;
    }
    const gl=this.gl;
    const compile=(type,src)=>{const sh=gl.createShader(type);gl.shaderSource(sh,src);gl.compileShader(sh);if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(sh));return sh;};
    this.program=gl.createProgram();gl.attachShader(this.program,compile(gl.VERTEX_SHADER,vertex));gl.attachShader(this.program,compile(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(this.program);if(!gl.getProgramParameter(this.program,gl.LINK_STATUS))throw new Error('The graphics program could not start.');gl.useProgram(this.program);
    this.attrs=['aPosition','aNormal','aColor'].map(n=>gl.getAttribLocation(this.program,n));this.uVP=gl.getUniformLocation(this.program,'uVP');this.uEye=gl.getUniformLocation(this.program,'uEye');this.uniforms=Object.fromEntries(['uSpot','uSpotlight','uLightVP','uFog','uSun','uLightColor','uShadow','uShadows','uExposure','uFogNear','uFogFar'].map(n=>[n,gl.getUniformLocation(this.program,n)]));this.staticBuffer=gl.createBuffer();this.dynamicBuffer=gl.createBuffer();this.staticCount=0;
    gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.disable(gl.CULL_FACE);gl.clearColor(...this.fog,1);
    this.shadowProgram=gl.createProgram();gl.attachShader(this.shadowProgram,compile(gl.VERTEX_SHADER,shadowVertex));gl.attachShader(this.shadowProgram,compile(gl.FRAGMENT_SHADER,shadowFragment));gl.linkProgram(this.shadowProgram);
    this.shadowPosition=gl.getAttribLocation(this.shadowProgram,'aPosition');this.shadowVP=gl.getUniformLocation(this.shadowProgram,'uVP');
    this.shadowTexture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,this.shadowTexture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1024,1024,0,gl.RGBA,gl.UNSIGNED_BYTE,null);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    this.shadowFBO=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,this.shadowFBO);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,this.shadowTexture,0);const depth=gl.createRenderbuffer();gl.bindRenderbuffer(gl.RENDERBUFFER,depth);gl.renderbufferStorage(gl.RENDERBUFFER,gl.DEPTH_COMPONENT16,1024,1024);gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.RENDERBUFFER,depth);this.hasShadows=gl.checkFramebufferStatus(gl.FRAMEBUFFER)===gl.FRAMEBUFFER_COMPLETE;gl.bindFramebuffer(gl.FRAMEBUFFER,null);
    this.eye=[14,18,25];this.target=[0,0,0];this.resize();
  }
  resize(){const r=this.software?.7:Math.min(devicePixelRatio||1,this.options.pixelRatio||1.5),w=Math.round(this.canvas.clientWidth*r),h=Math.round(this.canvas.clientHeight*r);if(w!==this.canvas.width||h!==this.canvas.height){this.canvas.width=w;this.canvas.height=h;}if(this.gl)this.gl.viewport(0,0,w,h);this.aspect=w/Math.max(1,h);}
  setStatic(batch){if(this.software){this.staticData=new Float32Array(batch.data);return;}const gl=this.gl;gl.bindBuffer(gl.ARRAY_BUFFER,this.staticBuffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(batch.data),gl.STATIC_DRAW);this.staticCount=batch.data.length/9;}
  bind(buffer){const gl=this.gl;gl.bindBuffer(gl.ARRAY_BUFFER,buffer);this.attrs.forEach((a,i)=>{gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,3,gl.FLOAT,false,36,i*12);});}
  render(batch){
    if(this.software){this.renderSoftware(batch);return;}
    const gl=this.gl,t=this.target,lightEye=t.map((v,i)=>v+this.sun[i]*60),r=this.options.shadowRadius||30;
    const ortho=new Float32Array([1/r,0,0,0,0,1/r,0,0,0,0,-2/150,0,0,0,-1,1]);
    const lightVP=mul(ortho,lookAt(lightEye,t));
    this.vp=mul(perspective(this.fov,this.aspect,.1,190),lookAt(this.eye,t));
    gl.bindBuffer(gl.ARRAY_BUFFER,this.dynamicBuffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(batch.data),gl.DYNAMIC_DRAW);
    if(this.hasShadows&&this.options.shadows!==false){
      gl.bindFramebuffer(gl.FRAMEBUFFER,this.shadowFBO);gl.viewport(0,0,1024,1024);gl.clearColor(1,1,1,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(this.shadowProgram);gl.uniformMatrix4fv(this.shadowVP,false,lightVP);
      for(let i=0;i<8;i++)gl.disableVertexAttribArray(i);
      gl.enableVertexAttribArray(this.shadowPosition);
      for(const [buffer,count] of [[this.staticBuffer,this.staticCount],[this.dynamicBuffer,batch.data.length/9]]){gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.vertexAttribPointer(this.shadowPosition,3,gl.FLOAT,false,36,0);gl.drawArrays(gl.TRIANGLES,0,count);}
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,this.canvas.width,this.canvas.height);gl.clearColor(...this.fog,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(this.program);
    gl.uniformMatrix4fv(this.uVP,false,this.vp);gl.uniformMatrix4fv(this.uniforms.uLightVP,false,lightVP);gl.uniform3fv(this.uEye,this.eye);gl.uniform3fv(this.uniforms.uSpot,norm(this.target.map((v,i)=>v-this.eye[i])));gl.uniform1f(this.uniforms.uSpotlight,this.options.spotlight?1:0);gl.uniform3fv(this.uniforms.uFog,this.fog);gl.uniform3fv(this.uniforms.uSun,this.sun);gl.uniform3fv(this.uniforms.uLightColor,this.lightColor);gl.uniform1f(this.uniforms.uExposure,this.exposure);gl.uniform1f(this.uniforms.uFogNear,this.fogNear);gl.uniform1f(this.uniforms.uFogFar,this.fogFar);gl.uniform1f(this.uniforms.uShadows,this.hasShadows&&this.options.shadows!==false?1:0);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,this.shadowTexture);gl.uniform1i(this.uniforms.uShadow,0);
    this.bind(this.staticBuffer);gl.drawArrays(gl.TRIANGLES,0,this.staticCount);this.bind(this.dynamicBuffer);gl.drawArrays(gl.TRIANGLES,0,batch.data.length/9);
  }
  renderSoftware(batch){
    const ctx=this.ctx,w=this.canvas.width,h=this.canvas.height;
    const m=this.vp=mul(perspective(this.fov,this.aspect,.1,170),lookAt(this.eye,this.target)),eye=this.eye;
    if(!this.image||this.image.width!==w||this.image.height!==h){this.image=ctx.createImageData(w,h);this.pixels=new Uint32Array(this.image.data.buffer);this.depth=new Float32Array(w*h);}
    this.pixels.fill(0xffc7cfa3);this.depth.fill(0);const triangles=[];
    for(const data of [this.staticData,batch.data])for(let i=0;i<data.length;i+=27){
      const mx=(data[i]+data[i+9]+data[i+18])/3,my=(data[i+1]+data[i+10]+data[i+19])/3,mz=(data[i+2]+data[i+11]+data[i+20])/3;
      const nx=(data[i+3]+data[i+12]+data[i+21])/3,ny=(data[i+4]+data[i+13]+data[i+22])/3,nz=(data[i+5]+data[i+14]+data[i+23])/3;
      if(nx*(eye[0]-mx)+ny*(eye[1]-my)+nz*(eye[2]-mz)<-.01)continue;
      const points=[],inverse=[];let depth=0,skip=false;
      for(let j=0;j<3;j++){const k=i+j*9,x=data[k],y=data[k+1],z=data[k+2],cw=m[3]*x+m[7]*y+m[11]*z+m[15];if(cw<.2){skip=true;break;}depth+=cw;inverse.push(1/cw);points.push(((m[0]*x+m[4]*y+m[8]*z+m[12])/cw*.5+.5)*w,(.5-(m[1]*x+m[5]*y+m[9]*z+m[13])/cw*.5)*h);}
      if(skip||points.every((n,j)=>j%2===1||n<0)||points.every((n,j)=>j%2===1||n>w)||points.every((n,j)=>j%2===0||n<0)||points.every((n,j)=>j%2===0||n>h))continue;
      const sun=Math.max(0,(-nx*.5+ny*.85+nz*.45)/(Math.hypot(nx,ny,nz)||1)),light=.72+ny*.12+sun*.35;
      const fog=clamp((Math.hypot(mx-eye[0],my-eye[1],mz-eye[2])-35)/65,0,1),rgb=[.64,.81,.78].map((f,k)=>Math.round(clamp(mix(data[i+6+k]*light,f,fog),0,1)*255));
      triangles.push({points,inverse,depth,color:(0xff000000|(rgb[2]<<16)|(rgb[1]<<8)|rgb[0])>>>0});
    }
    triangles.sort((a,b)=>a.depth-b.depth);
    const pixels=this.pixels,depths=this.depth;
    for(const t of triangles){
      const [ax,ay,bx,by,cx,cy]=t.points,area=(by-cy)*(ax-cx)+(cx-bx)*(ay-cy);if(Math.abs(area)<.01)continue;
      const minX=Math.max(0,Math.floor(Math.min(ax,bx,cx))),maxX=Math.min(w-1,Math.ceil(Math.max(ax,bx,cx))),minY=Math.max(0,Math.floor(Math.min(ay,by,cy))),maxY=Math.min(h-1,Math.ceil(Math.max(ay,by,cy)));
      const da=(by-cy)/area,db=(cy-ay)/area,ea=(cx-bx)/area,eb=(ax-cx)/area,iz=t.inverse;
      for(let y=minY;y<=maxY;y++){
        let a=(by-cy)*(minX+.5-cx)/area+(cx-bx)*(y+.5-cy)/area,b=(cy-ay)*(minX+.5-cx)/area+(ax-cx)*(y+.5-cy)/area,index=y*w+minX;
        for(let x=minX;x<=maxX;x++,index++,a+=da,b+=db){if(a<0||b<0||a+b>1)continue;const z=a*iz[0]+b*iz[1]+(1-a-b)*iz[2];if(z>depths[index]){depths[index]=z;pixels[index]=t.color;}}
      }
    }
    ctx.putImageData(this.image,0,0);
  }
  project(p){if(!this.vp)return [-999,-999];const m=this.vp,w=m[3]*p[0]+m[7]*p[1]+m[11]*p[2]+m[15];return [(m[0]*p[0]+m[4]*p[1]+m[8]*p[2]+m[12])/w/2+.5,.5-(m[1]*p[0]+m[5]*p[1]+m[9]*p[2]+m[13])/w/2];}
  groundPoint(clientX,clientY){const rect=this.canvas.getBoundingClientRect(),nx=(clientX-rect.left)/rect.width*2-1,ny=1-(clientY-rect.top)/rect.height*2;const forward=norm(this.target.map((v,i)=>v-this.eye[i])),right=norm(cross(forward,[0,1,0])),up=cross(right,forward),tan=Math.tan(this.fov/2),dir=norm(forward.map((v,i)=>v+right[i]*nx*tan*this.aspect+up[i]*ny*tan));const t=-this.eye[1]/dir[1];return t>0?[this.eye[0]+dir[0]*t,this.eye[2]+dir[2]*t]:null;}
}
