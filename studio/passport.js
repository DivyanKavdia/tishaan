// A local record of real play sessions. Existing game saves remain authoritative.
const KEY = 'tz-player-passport-v1';
const memory = new Map();
const finite = (value, max = 1e9) => Math.max(0, Math.min(max, Number.isFinite(Number(value)) ? Number(value) : 0));
export function readLocal(key, fallback = null) {
  try { return JSON.parse(localStorage.getItem(key)) ?? memory.get(key) ?? fallback; }
  catch { return memory.get(key) ?? fallback; }
}
function writeLocal(key, value) {
  memory.set(key, value);
  try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; }
}
export function normalizePassport(raw) {
  const profile = { version: 1, games: {}, favorites: [] };
  if (!raw || typeof raw !== 'object') return profile;
  profile.favorites = [...new Set(Array.isArray(raw.favorites) ? raw.favorites.filter(s => /^[a-z0-9-]{1,50}$/.test(s)) : [])].slice(0,100);
  for (const [slug, game] of Object.entries(raw.games || {}).slice(0,100)) {
    if (!/^[a-z0-9-]{1,50}$/.test(slug) || !game || typeof game !== 'object') continue;
    const records = {};
    for (const [key, record] of Object.entries(game.records || {}).slice(0,500)) {
      if (!/^[a-z0-9:-]{1,80}$/.test(key) || !record || typeof record !== 'object') continue;
      records[key] = { score: finite(record.score), stars: Math.floor(finite(record.stars,3)), time: finite(record.time,86400) };
    }
    profile.games[slug] = { visits: Math.floor(finite(game.visits)), lastPlayed: finite(game.lastPlayed,1e15), records };
  }
  return profile;
}
export const readPassport = () => normalizePassport(readLocal(KEY));
export function visitGame(slug) {
  const p = readPassport();
  const game = p.games[slug] ||= { visits: 0, lastPlayed: 0, records: {} };
  game.visits++; game.lastPlayed = Date.now();
  writeLocal('tz-last-played', { slug });
  return writeLocal(KEY, p);
}
export function recordRun(slug, { level = 0, difficulty = 'normal', score = 0, stars = 1, seconds = 0 } = {}) {
  const p = readPassport(), game = p.games[slug] ||= { visits: 1, lastPlayed: Date.now(), records: {} };
  const key = `${difficulty}:${level}`, old = game.records[key] || { score: 0, stars: 0, time: 0 };
  const t = finite(seconds,86400);
  game.records[key] = { score: Math.max(old.score,finite(score)), stars: Math.max(old.stars,Math.floor(finite(stars,3))), time: t > 0 ? old.time > 0 ? Math.min(old.time,t) : t : old.time };
  return writeLocal(KEY, normalizePassport(p));
}
export function favoriteGame(slug) {
  const p = readPassport();
  p.favorites = p.favorites.includes(slug) ? p.favorites.filter(s => s !== slug) : [...p.favorites,slug];
  writeLocal(KEY,p); return p.favorites.includes(slug);
}
export function gameProgress(slug, profile = readPassport()) {
  const game = profile.games[slug], levels = new Map();
  for (const [key,record] of Object.entries(game?.records || {})) {
    const level = key.slice(key.indexOf(':')+1);
    if(!/^\d+$/.test(level))continue;
    levels.set(level, Math.max(levels.get(level) || 0,record.stars));
  }
  let prior = readLocal('tz-studio-'+slug)?.stars;
  if (slug === 'candy-pop') prior = readLocal('tishaan-candy-pop-v1')?.stars;
  if (prior && typeof prior === 'object') for (const [level,stars] of Object.entries(prior)) {
    levels.set(level,Math.max(levels.get(level)||0,Math.floor(finite(stars,3))));
  }
  if (slug === 'iron-citadel') {
    const unlocked = Math.floor(finite(readLocal('iron-citadel-v1')?.unlocked,8));
    for (let i=0;i<unlocked;i++) levels.set(String(i),Math.max(1,levels.get(String(i))||0));
  }
  if (slug === 'monterra') for (const i of readLocal('monterra-wilds-save-v3')?.badges || []) levels.set(String(i),1);
  const values = [...levels.values()];
  return { played: !!game || values.some(Boolean), cleared: values.filter(Boolean).length, stars: values.reduce((a,b)=>a+b,0), perfect: values.filter(n=>n===3).length, best: Math.max(0,...Object.values(game?.records||{}).map(r=>r.score)), lastPlayed: game?.lastPlayed || 0 };
}
export function achievements(progress) {
  const played=progress.filter(p=>p.played).length, clears=progress.reduce((n,p)=>n+p.cleared,0), perfect=progress.reduce((n,p)=>n+p.perfect,0);
  return [
    {name:'First steps', detail:'Play your first game', value:played, goal:1, icon:'↗'},
    {name:'World explorer', detail:'Play five different games', value:played, goal:5, icon:'◎'},
    {name:'Mission master', detail:'Clear ten stages', value:clears, goal:10, icon:'⚑'},
    {name:'Star collector', detail:'Earn three stars on five stages', value:perfect, goal:5, icon:'★'},
  ];
}
