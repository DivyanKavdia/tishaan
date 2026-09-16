/* Gameplay rules are independent of rendering so progression and save handling are testable. */
export const VERSION='5.0.0';
export const SAVE_KEY='monterra-wilds-save-v3';
export const FAMILIES=[
 {type:'Flame',names:['Embercub','Pyrolynx','Volcarion'],color:'#ed8b4b',accent:'#ffd379',move:'Ember rush',strong:1,weak:2,description:'A fearless fire cub. Its tiny tail flame grows into blazing wings.'},
 {type:'Leaf',names:['Spriglet','Florabbit','Verdantusk'],color:'#93c979',accent:'#ffce8d',move:'Leaf cyclone',strong:2,weak:0,description:'A shy woodland companion with leaf ears and a growing flower crown.'},
 {type:'Tide',names:['Aquaff','Tideruff','Leviwave'],color:'#75c6d7',accent:'#fff0c9',move:'Tidal surge',strong:0,weak:3,description:'A curious blue water dragon. Follow its fins to the crystal lake.'},
 {type:'Spark',names:['Voltkit','Stormcat','Thundrake'],color:'#efcc64',accent:'#574a75',move:'Thunder dash',strong:2,weak:4,description:'A lightning-eared fox that stores sparks in its sweeping tail.'},
 {type:'Stone',names:['Pebblit','Cragoon','Titanrock'],color:'#a2a7b7',accent:'#93e3d4',move:'Crystal crash',strong:3,weak:1,description:'A gentle rock guardian with bright crystals growing through its armor.'}
];
export const stagesFor=level=>level>=12?2:level>=7?1:0;
export const nameOf=m=>FAMILIES[m.family].names[m.stage];
export const maxHp=m=>44+m.level*7+m.stage*18;
export const xpNeeded=m=>40+m.level*4;
export const canEvolve=m=>m.stage<stagesFor(m.level);
export function member(family=0,level=5,stage=0){return {family,level,stage,xp:0,hp:maxHp({level,stage})};}
export function freshState(family=0){return {version:4,difficulty:'explorer',team:[member(family)],active:0,orbs:12,potions:5,badges:[],wins:0,catches:0,position:{x:0,z:8},started:true,muted:false,steps:0};}
export function normalize(raw){
 if(!raw||!Array.isArray(raw.team)||!raw.team.length)return null;
 const base=freshState();const valid=raw.team.filter(m=>m&&typeof m==='object'&&Number.isInteger(m.family)&&m.family>=0&&m.family<FAMILIES.length).slice(0,60).map(m=>{const level=Math.max(1,Math.min(50,Math.floor(Number(m.level)||5))),stage=Math.max(0,Math.min(2,Math.floor(Number(m.stage)||0)));const n=member(m.family,level,stage);n.xp=Math.max(0,Math.min(xpNeeded(n)-1,Number(m.xp)||0));n.hp=Math.max(0,Math.min(maxHp(n),Number.isFinite(m.hp)?m.hp:maxHp(n)));return n;});
 if(!valid.length)return null;base.team=valid;base.active=Math.max(0,Math.min(valid.length-1,Math.floor(Number(raw.active)||0)));
 for(const k of ['orbs','potions','wins','catches','steps'])base[k]=Math.max(0,Math.min(9999,Math.floor(Number(raw[k])||0)));
 base.badges=[...new Set(Array.isArray(raw.badges)?raw.badges.filter(x=>Number.isInteger(x)&&x>=0&&x<6):[])];base.muted=raw.muted===true;base.difficulty=['explorer','adventurer','legend'].includes(raw.difficulty)?raw.difficulty:'explorer';
 const p=raw.position||{};base.position={x:Math.max(-31,Math.min(31,Number(p.x)||0)),z:Math.max(-31,Math.min(31,Number(p.z??p.y)||8))};return base;
}
export function gainXp(m,amount){let levels=0;m.xp+=amount;while(m.level<50&&m.xp>=xpNeeded(m)){m.xp-=xpNeeded(m);m.level++;levels++;}if(m.level===50)m.xp=Math.min(m.xp,xpNeeded(m)-1);if(levels)m.hp=maxHp(m);return levels;}
export function evolve(m){if(!canEvolve(m))return false;m.stage++;m.hp=maxHp(m);return true;}
export function effectiveness(a,b){return FAMILIES[a.family].strong===b.family?1.5:FAMILIES[a.family].weak===b.family?.75:1;}
export function damage(a,b,special=false,rng=Math.random){return Math.max(4,Math.round((8+a.level*1.3+a.stage*3)*(special?1.65:1)*effectiveness(a,b)*(.92+rng()*.16)));}
export function captureChance(wild){return Math.max(.15,Math.min(.93,.34+(1-wild.hp/maxHp(wild))*.64-wild.stage*.09));}
export function healthyIndex(state){return state.team.findIndex(m=>m.hp>0);}
