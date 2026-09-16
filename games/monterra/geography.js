export const WORLD_RADIUS = 220;
export const CAMP = {x:0,z:8};
export const LAKES = [
  {x:19,z:0,rx:7.8,rz:6.2},
  {x:-74,z:58,rx:14,rz:10},
  {x:88,z:-72,rx:18,rz:12},
  {x:116,z:92,rx:11,rz:17},
];
export const lakeDistance=(x,z,l=LAKES[0])=>((x-l.x)/l.rx)**2+((z-l.z)/l.rz)**2;
export const inWater=(x,z,padding=1)=>LAKES.some(l=>lakeDistance(x,z,l)<padding);
export const walkable=(x,z)=>Number.isFinite(x)&&Number.isFinite(z)&&Math.hypot(x,z)<WORLD_RADIUS&&!inWater(x,z,1.04);
export function safePosition(position={}) {
  const x=Number(position.x),z=Number(position.z??position.y);
  return walkable(x,z)?{x,z}:{...CAMP};
}
export const HABITATS=[
  {x:-56,z:46,families:[1,4,3],level:9}, {x:57,z:42,families:[1,3,2],level:10},
  {x:-65,z:-64,families:[4,2,1],level:12}, {x:72,z:-104,families:[0,4,3],level:15},
  {x:-132,z:30,families:[1,4,3],level:17}, {x:142,z:16,families:[3,0,4],level:18},
  {x:-45,z:148,families:[2,4,3],level:20}, {x:12,z:-160,families:[0,4,2],level:22},
];
export function habitatSpawns() {
  return HABITATS.flatMap((h,index)=>Array.from({length:8},(_,i)=>{
    const a=i*Math.PI/4+index*.3,r=7+(i%3)*5,x=h.x+Math.cos(a)*r,z=h.z+Math.sin(a)*r;
    return walkable(x,z)?[h.families[i%3],x,z,h.level+i%3]:null;
  }).filter(Boolean));
}
