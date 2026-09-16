export const vertex = `
attribute vec3 aPosition; attribute vec3 aNormal; attribute vec3 aColor;
uniform mat4 uVP; uniform mat4 uLightVP;
varying vec3 vPosition; varying vec3 vNormal; varying vec3 vColor; varying vec4 vShadow;
void main(){vPosition=aPosition;vNormal=aNormal;vColor=aColor;vShadow=uLightVP*vec4(aPosition,1.);gl_Position=uVP*vec4(aPosition,1.);}`;
export const fragment = `
precision highp float;
varying vec3 vPosition;varying vec3 vNormal;varying vec3 vColor;varying vec4 vShadow;
uniform vec3 uEye;uniform vec3 uFog;uniform vec3 uSun;uniform vec3 uLightColor;
uniform vec3 uSpot;uniform float uSpotlight;
uniform sampler2D uShadow;uniform float uShadows;uniform float uExposure;uniform float uFogNear;uniform float uFogFar;
float hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
float shadow(vec3 n){if(uShadows<.5)return 1.;vec3 q=vShadow.xyz/vShadow.w*.5+.5;if(q.x<0.||q.x>1.||q.y<0.||q.y>1.||q.z>1.)return 1.;float s=0.;float bias=max(.004*(1.-dot(n,uSun)),.0025);for(int x=-1;x<=1;x++)for(int y=-1;y<=1;y++){vec4 d=texture2D(uShadow,q.xy+vec2(float(x),float(y))*.0014);float z=dot(d,vec4(1.,1./255.,1./65025.,1./16581375.));s+=step(q.z-bias,z);}return .30+.70*s/9.;}
vec3 aces(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);}
void main(){vec3 n=normalize(vNormal),v=normalize(uEye-vPosition),l=normalize(uSun),h=normalize(l+v);float nl=max(dot(n,l),0.);float grain=noise(vPosition*5.2)*.09+noise(vPosition*.72)*.07;vec3 base=pow(vColor,vec3(2.2))*(.94+grain);float sh=shadow(n);float rough=.32+noise(vPosition*1.4)*.18;float spec=pow(max(dot(n,h),0.),mix(100.,16.,rough));float fres=pow(1.-max(dot(n,v),0.),4.);vec3 ambient=mix(vec3(.11,.14,.17),vec3(.38,.46,.52),n.y*.5+.5);vec3 lit=base*(ambient+uLightColor*nl*sh*1.65)+uLightColor*spec*sh*.32+vec3(.13,.18,.20)*fres*.35;float beam=smoothstep(.78,.97,dot(normalize(vPosition-uEye),uSpot))*uSpotlight;lit+=base*beam*3./(1.+distance(vPosition,uEye)*.12);float fog=smoothstep(uFogNear,uFogFar,distance(vPosition,uEye));vec3 mapped=pow(aces(lit*uExposure),vec3(1./2.2));gl_FragColor=vec4(mix(mapped,uFog,fog),1.);}`;
export const shadowVertex=`attribute vec3 aPosition;uniform mat4 uVP;void main(){gl_Position=uVP*vec4(aPosition,1.);}`;
export const shadowFragment=`precision highp float;void main(){vec4 p=fract(gl_FragCoord.z*vec4(1.,255.,65025.,16581375.));p-=p.yzww*vec4(1./255.,1./255.,1./255.,0.);gl_FragColor=p;}`;
