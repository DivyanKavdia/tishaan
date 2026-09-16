import { HEROES, createMatch, stepMatch } from './engine.js';
import { drawHero, drawMatch } from './art.js';
import {ArenaScene} from './scene.js';
import {readProgress,saveProgress,completeLevel} from '../../../studio/core.js';

const $ = id => document.getElementById(id);
const heroIds = Object.keys(HEROES);
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const preference = {
  get(key, fallback) { try { return localStorage.getItem(`arena-${key}`) ?? fallback; } catch { return fallback; } },
  set(key, value) { try { localStorage.setItem(`arena-${key}`, String(value)); } catch { /* Private browsing can disable storage. */ } },
};
let selectedHero = preference.get('hero', 'ironman');
if (!HEROES[selectedHero]) selectedHero = 'ironman';
let soundEnabled = preference.get('sound', 'false') === 'true';
let match = null;
let paused = false;
let frame = null;
let lastFrame = 0;
let lastAnnouncement = '';
let audioContext;
const keys = new Set();
const pointers = new Map();
const pulseInputs = new Set();
const arena = $('arena');
const context = arena.getContext('2d');
let arenaScene=null;
const tournament=readProgress('avengers-arena',12);
const stageNames=['First challenger','Shield lesson','Thunder trial','Gamma rising','Crossfire','Storm watch','Iron resolve','A hero stands','God of thunder','Gamma protocol','Last challenger','Avengers champion'];
function updateTournament(){
 const previous=Number($('campaign-stage').value)||0;
 $('campaign-stage').innerHTML=stageNames.map((name,i)=>`<option value="${i}" ${i>tournament.unlocked?'disabled':''}>${String(i+1).padStart(2,'0')} · ${name}${i>tournament.unlocked?' — locked':''}</option>`).join('');
 $('campaign-stage').value=Math.min(previous,tournament.unlocked);
 $('campaign-progress').textContent=`TOURNAMENT · ${tournament.stars.filter(Boolean).length}/12 stages cleared · ${tournament.stars.reduce((a,b)=>a+b,0)}/36 stars`;
 const campaign=$('play-mode').value==='campaign';$('opponent').disabled=campaign;$('campaign-stage').disabled=!campaign;
}
$('play-mode').onchange=updateTournament;updateTournament();
const tips = {
  ironman: 'REPULSOR BLAST · Fire a ranged energy shot.',
  captain: 'SHIELD THROW · A shield that comes back to you.',
  thor: 'LIGHTNING STRIKE · Call thunder onto your opponent.',
  hulk: 'GAMMA SMASH · Send shockwaves across the ground.',
};

function initAudio() {
  if (!soundEnabled) return;
  try {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return;
    audioContext ||= new Audio();
    if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
  } catch { /* Audio is optional; gameplay must remain available. */ }
}

function tone(start, end, duration, wave = 'sine', volume = 0.07, delay = 0) {
  if (!soundEnabled || !audioContext || audioContext.state !== 'running') return;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  const now = audioContext.currentTime + delay;
  oscillator.type = wave;
  oscillator.frequency.setValueAtTime(start, now);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, end), now + duration);
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(volume, now + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
  oscillator.connect(gain); gain.connect(audioContext.destination);
  oscillator.start(now); oscillator.stop(now + duration + 0.02);
  oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
}

function playEvents(events) {
  for (const event of events) {
    if (event.type === 'hit') tone(event.special ? 120 : 180, 35, 0.13, 'triangle', 0.13);
    else if (event.type === 'block') tone(600, 160, 0.075, 'triangle', 0.04);
    else if (event.type === 'swing') tone(210, 70, 0.08, 'triangle', 0.025);
    else if (event.type === 'special') tone(event.hero === 'hulk' ? 95 : 230, event.hero === 'hulk' ? 30 : 650, 0.27, 'sawtooth', 0.026);
    else if (event.type === 'jump') tone(140, 330, 0.11, 'sine', 0.024);
    else if (event.type === 'fight') tone(390, 780, 0.22, 'triangle', 0.06);
    else if (event.type === 'finish') {
      const notes = event.winner === 'player' ? [392, 494, 587, 784] : [330, 294, 220];
      notes.forEach((frequency, i) => tone(frequency, frequency, 0.24, 'triangle', 0.07, i * 0.13));
    }
  }
}

function syncSound() {
  $('sound-label').textContent = soundEnabled ? 'Sound on' : 'Sound off';
  $('sound-button').setAttribute('aria-label', soundEnabled ? 'Mute sound' : 'Enable sound');
  $('sound-button').setAttribute('aria-pressed', String(soundEnabled));
  $('sound-symbol').style.opacity = soundEnabled ? '1' : '0.5';
}

function fitCanvas(canvas) {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.max(1, Math.round(rect.width * dpr));
  canvas.height = Math.max(1, Math.round(rect.height * dpr));
  const c = canvas.getContext('2d');
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { c, width: rect.width, height: rect.height };
}

function drawMenu() {
  if ($('select-screen').hidden) return;
  const { c, width, height } = fitCanvas($('hero-art'));
  const hero = HEROES[selectedHero];
  c.clearRect(0, 0, width, height);
  const cx = width * 0.64, floor = height * 0.95;
  c.fillStyle = '#00000033';
  c.beginPath(); c.ellipse(cx, floor, width * 0.21, height * 0.025, 0, 0, Math.PI * 2); c.fill();
  drawHero(c, selectedHero, cx, floor - 3, height / 162 / (selectedHero === 'hulk' ? 1.12 : 1), -1, { time: 0.4 });
  document.querySelectorAll('.hero-card canvas').forEach(canvas => {
    const card = fitCanvas(canvas);
    card.c.clearRect(0, 0, card.width, card.height);
    drawHero(card.c, canvas.dataset.hero, card.width * 0.49, card.height * 1.22, card.height / 116 / (canvas.dataset.hero === 'hulk' ? 1.12 : 1), 1);
  });
}

function selectHero(id, announce = true) {
  selectedHero = id;
  preference.set('hero', id);
  const hero = HEROES[id];
  $('hero-name').textContent = hero.name;
  $('hero-kicker').textContent = hero.title.toUpperCase();
  $('hero-special').textContent = hero.special;
  $('hero-preview').style.setProperty('--hero', hero.color);
  document.querySelector('.preview-index').textContent = `0${heroIds.indexOf(id) + 1} / 04`;
  $('hero-stats').innerHTML = [['POWER', hero.power], ['SPEED', hero.agility], ['ARMOR', hero.defense]].map(([label, value]) => `<div class="hero-stat" aria-label="${label}: ${value} out of 5">${label}<span class="stat-pips" aria-hidden="true">${Array.from({ length: 5 }, (_, i) => `<i class="${i < value ? 'filled' : ''}"></i>`).join('')}</span></div>`).join('');
  document.querySelectorAll('.hero-card').forEach(card => card.setAttribute('aria-pressed', String(card.dataset.hero === id)));
  if (announce) $('live-status').textContent = `${hero.name} selected. Special move: ${hero.special}.`;
  drawMenu();
}

for (const [index, id] of heroIds.entries()) {
  const button = document.createElement('button');
  button.className = 'hero-card'; button.dataset.hero = id;
  button.setAttribute('aria-label', `${HEROES[id].name}. ${HEROES[id].special}.`);
  button.setAttribute('aria-pressed', String(id === selectedHero));
  button.innerHTML = `<span class="hero-number" aria-hidden="true">0${index + 1}</span><span class="selection-check" aria-hidden="true">✓</span><canvas data-hero="${id}" aria-hidden="true"></canvas><span class="card-name">${HEROES[id].name}</span><span class="card-special">${HEROES[id].special}</span>`;
  button.addEventListener('click', () => { selectHero(id); initAudio(); tone(340 + index * 70, 480, 0.06, 'sine', 0.04); });
  $('roster').append(button);
}

function clearInput() {
  keys.clear(); pointers.clear(); pulseInputs.clear();
  document.querySelectorAll('.touch-button').forEach(button => button.classList.remove('pressed'));
}

function resizeArena() {
  if (!match) return;
  const rect = arena.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const oldWidth = match.width, oldFloor = match.floor;
  const portrait = rect.height > rect.width * 1.1;
  const logicalWidth = window.innerWidth <= 600 ? 520 : Math.max(700, Math.min(1120, rect.width * 1.1));
  const ratio = logicalWidth / oldWidth;
  match.width = logicalWidth;
  match.height = rect.height / rect.width * logicalWidth;
  match.floor = portrait ? match.height * 0.76 : match.height - Math.min(84, match.height * 0.16);
  for (const actor of [match.player, match.enemy]) {
    actor.x = Math.max(55, Math.min(match.width - 55, actor.x * ratio));
    if (actor.attack) actor.attack.targetX *= ratio;
  }
  for (const projectile of match.projectiles) { projectile.x *= ratio; projectile.y += match.floor - oldFloor; }
  for (const effect of match.effects) { effect.x *= ratio; effect.y += match.floor - oldFloor; }
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  arena.width = Math.round(rect.width * dpr); arena.height = Math.round(rect.height * dpr);
  render();
}

function startGame(rematch = false) {
  initAudio(); clearInput();
  const old = match;
  let opponent = $('opponent').value;
  if (rematch && old) opponent = old.enemy.hero;
  if (opponent === 'random') {
    const choices = heroIds.filter(id => id !== selectedHero);
    opponent = choices[Math.floor(Math.random() * choices.length)];
  }
  const stage=$('play-mode').value==='campaign'?Number($('campaign-stage').value):null;
  if(stage!==null)opponent=['captain','ironman','thor','hulk'][stage%4];
  if (frame !== null) cancelAnimationFrame(frame);
  document.body.classList.add('is-playing');
  $('select-screen').hidden = true; $('game-screen').hidden = false;
  $('pause-overlay').hidden = true; $('result-overlay').hidden = true;
  $('pause-button').disabled = false;
  match = createMatch({ hero: selectedHero, opponent, difficulty: $('difficulty').value });
  match.campaignLevel=stage;match.perk=$('suit-perk').value;
  if(stage!==null){match.enemyDamage=.8+stage*.035;match.enemy.hp=match.enemy.maxHp=Math.round(HEROES[opponent].health*(.8+stage*.04));}
  document.querySelector('.timer>span').textContent=stage===null?'QUICK BATTLE':`STAGE ${String(stage+1).padStart(2,'0')}`;
  document.querySelector('.arena-location').textContent=stage===null?'/ FREE PLAY':`/ ${stageNames[stage].toUpperCase()}`;
  try{arenaScene ||= new ArenaScene($('arena-3d'));$('arena-3d').hidden=false;arena.style.opacity='0';}catch(e){$('arena-3d').hidden=true;arena.style.opacity='1';console.warn('Using the 2D arena renderer.',e.message);}

  paused = false; lastFrame = 0; lastAnnouncement = '';
  $('player-name').textContent = HEROES[selectedHero].name.toUpperCase();
  $('enemy-name').textContent = HEROES[opponent].name.toUpperCase();
  $('move-tip').textContent = tips[selectedHero];
  $('player-health').setAttribute('aria-valuemax', HEROES[selectedHero].health);
  $('enemy-health').setAttribute('aria-valuemax', HEROES[opponent].health);
  $('live-status').textContent = `${HEROES[selectedHero].name} versus ${HEROES[opponent].name}. Get ready.`;
  window.scrollTo(0, 0);
  resizeArena(); updateHUD();
  arena.focus({ preventScroll: true });
  frame = requestAnimationFrame(tick);
}

function goMenu() {
  clearInput();
  if (frame !== null) cancelAnimationFrame(frame);
  frame = null; match = null; paused = false;
  document.body.classList.remove('is-playing');
  $('game-screen').hidden = true; $('select-screen').hidden = false;
  $('pause-overlay').hidden = true; $('result-overlay').hidden = true;
  drawMenu();
  document.querySelector(`.hero-card[data-hero="${selectedHero}"]`).focus({ preventScroll: true });
}

function pauseGame() {
  if (!match || match.state === 'finished' || paused) return;
  paused = true; clearInput();
  $('pause-overlay').hidden = false;
  $('announcement').hidden = true;
  $('live-status').textContent = 'Battle paused.';
  $('resume-button').focus({ preventScroll: true });
}

function resumeGame() {
  if (!match || !paused) return;
  initAudio(); clearInput(); paused = false; lastFrame = 0;
  $('pause-overlay').hidden = true;
  $('live-status').textContent = 'Battle resumed.';
  arena.focus({ preventScroll: true });
}

function readInput() {
  const input = {};
  for (const action of pointers.values()) input[action] = true;
  for (const action of pulseInputs) input[action] = true;
  const mapping = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowUp: 'jump', KeyW: 'jump', Space: 'jump', KeyJ: 'attack', KeyK: 'special', KeyL: 'guard', ShiftLeft: 'guard', ShiftRight: 'guard' };
  for (const key of keys) if (mapping[key]) input[mapping[key]] = true;
  return input;
}

function updateHUD() {
  if (!match) return;
  for (const id of ['player', 'enemy']) {
    const actor = match[id], spec = HEROES[actor.hero];
    $(`${id}-health-fill`).style.width = `${Math.max(0, actor.hp / actor.maxHp * 100)}%`;
    $(`${id}-health`).setAttribute('aria-valuenow', Math.ceil(actor.hp));
    $(`${id}-energy-fill`).style.width = `${actor.energy}%`;
  }
  const ready = match.player.energy >= HEROES[match.player.hero].cost;
  $('special-button').classList.toggle('unavailable', !ready);
  $('special-button').setAttribute('aria-label', ready ? `Use ${HEROES[match.player.hero].special}` : `Special recharging: ${Math.floor(match.player.energy)} energy`);
  $('player-energy-label').textContent = ready ? 'SPECIAL READY' : 'RECHARGING';
  $('timer').textContent = String(Math.ceil(match.timeLeft)).padStart(2, '0');
  $('timer').parentElement.classList.toggle('urgent', match.timeLeft <= 15);
  let announcement = '';
  if (!paused && match.state === 'countdown') announcement = String(Math.max(1, Math.ceil(match.countdown)));
  else if (!paused && match.state === 'fighting' && match.elapsed < 3.4) announcement = 'FIGHT';
  $('announcement').hidden = !announcement;
  if (announcement !== lastAnnouncement) {
    $('announcement').querySelector('strong').textContent = announcement;
    $('announcement').querySelector('span').textContent = announcement === 'FIGHT' ? 'MAKE IT LEGENDARY' : 'GET READY';
    if (announcement && announcement !== 'FIGHT') tone(420, 390, 0.09, 'sine', 0.04);
    lastAnnouncement = announcement;
  }
}

function showResult() {
  clearInput(); $('announcement').hidden = true; $('pause-button').disabled = true;
  const victory = match.winner === 'player', draw = match.winner === 'draw';
  $('result-title').textContent = draw ? 'A worthy match.' : victory ? 'Victory.' : 'Not this time.';
  $('result-reason').textContent = match.finishReason.toUpperCase();
  $('result-mark').textContent = draw ? '◇' : victory ? '★' : '↺';
  $('result-description').textContent = draw ? 'Even heroes meet their match. Go again?' : victory ? `${HEROES[match.player.hero].name} owns the rooftop. Nicely done.` : `${HEROES[match.enemy.hero].name} takes this round. Your comeback starts here.`;
  if(victory&&match.campaignLevel!==null){const stars=match.player.hp/match.player.maxHp>=.7?3:match.player.hp/match.player.maxHp>=.35?2:1;completeLevel(tournament,match.campaignLevel,stars,match.player.hits*100,12);saveProgress('avengers-arena',tournament);updateTournament();$('result-description').textContent=`Stage ${match.campaignLevel+1} cleared. ${'★'.repeat(stars)}${'☆'.repeat(3-stars)} · ${stageNames[match.campaignLevel]}`;}
  $('rematch-button').innerHTML=victory&&match.campaignLevel!==null&&match.campaignLevel<11?'NEXT STAGE <span>↗</span>':'REMATCH <span>↗</span>';
  $('result-hits').textContent = match.player.hits;
  $('result-time').textContent = `${Math.round(75 - match.timeLeft)}s`;
  $('result-overlay').hidden = false;
  $('live-status').textContent = `${$('result-title').textContent} ${$('result-description').textContent}`;
  $('rematch-button').focus({ preventScroll: true });
}

function render() {
  if (!match || !context) return;
  if(arenaScene){arenaScene.render(match);return;}
  context.setTransform(arena.width / match.width, 0, 0, arena.height / match.height, 0, 0);
  drawMatch(context, match, reducedMotion);
}

function tick(now) {
  frame = null;
  if (!match) return;
  const dt = lastFrame ? (now - lastFrame) / 1000 : 1 / 60;
  lastFrame = now;
  if (!paused && match.state !== 'finished') {
    stepMatch(match, readInput(), dt);
    playEvents(match.events);
    updateHUD(); render();
    if (match.state === 'finished') showResult();
  }
  // Keep a single loop. Paused and finished screens do no drawing or simulation.
  frame = requestAnimationFrame(tick);
}

for (const button of document.querySelectorAll('[data-input]')) {
  const action = button.dataset.input;
  button.addEventListener('pointerdown', event => {
    if (!match || paused || match.state === 'finished') return;
    event.preventDefault(); initAudio();
    pointers.set(event.pointerId, action);
    button.classList.add('pressed');
    button.setPointerCapture(event.pointerId);
  });
  const release = event => {
    pointers.delete(event.pointerId);
    if (![...pointers.values()].includes(action)) button.classList.remove('pressed');
  };
  button.addEventListener('pointerup', release);
  button.addEventListener('pointercancel', release);
  button.addEventListener('lostpointercapture', release);
  button.addEventListener('contextmenu', event => event.preventDefault());
  button.addEventListener('click', event => {
    // Native keyboard and assistive-technology activation has no pointer event.
    if (event.detail === 0 && match && !paused && match.state !== 'finished') {
      pulseInputs.add(action);
      setTimeout(() => pulseInputs.delete(action), 150);
    }
  });
}

const gameKeys = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'KeyA', 'KeyD', 'KeyW', 'Space', 'KeyJ', 'KeyK', 'KeyL', 'ShiftLeft', 'ShiftRight']);
window.addEventListener('keydown', event => {
  if (!match || $('help-dialog').open) return;
  if (event.code === 'Escape') { event.preventDefault(); paused ? resumeGame() : pauseGame(); return; }
  if (!gameKeys.has(event.code) || paused || match.state === 'finished' || event.target.closest('button,select,input,textarea')) return;
  event.preventDefault(); keys.add(event.code);
});
window.addEventListener('keyup', event => keys.delete(event.code));
window.addEventListener('blur', () => { clearInput(); pauseGame(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) { clearInput(); pauseGame(); } });

$('start-button').addEventListener('click', () => startGame());
$('rematch-button').addEventListener('click', () => {if(match?.winner==='player'&&match.campaignLevel!==null&&match.campaignLevel<11)$('campaign-stage').value=match.campaignLevel+1;startGame(true);});
$('change-button').addEventListener('click', goMenu);
$('quit-button').addEventListener('click', goMenu);
$('pause-button').addEventListener('click', pauseGame);
$('resume-button').addEventListener('click', resumeGame);
$('home-link').addEventListener('click', event => { event.preventDefault(); if (match) goMenu(); else window.scrollTo({ top: 0, behavior: reducedMotion ? 'instant' : 'smooth' }); });
$('sound-button').addEventListener('click', () => { soundEnabled = !soundEnabled; preference.set('sound', soundEnabled); syncSound(); initAudio(); if (soundEnabled) tone(440, 660, 0.13); });
$('help-button').addEventListener('click', () => { pauseGame(); $('help-dialog').showModal(); });
$('close-help').addEventListener('click', () => $('help-dialog').close());
$('got-it-button').addEventListener('click', () => $('help-dialog').close());
$('help-dialog').addEventListener('click', event => {
  const rect = $('help-dialog').getBoundingClientRect();
  if (event.target === $('help-dialog') && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) $('help-dialog').close();
});
$('fullscreen-button').hidden = !document.documentElement.requestFullscreen;
$('fullscreen-button').addEventListener('click', async () => {
  try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); }
  catch { $('live-status').textContent = 'Full screen is unavailable. You can still play in this browser.'; }
});
document.addEventListener('fullscreenchange', () => { $('fullscreen-button').textContent = document.fullscreenElement ? 'Exit full screen' : 'Full screen'; resizeArena(); });

const observer = new ResizeObserver(() => { if (match) resizeArena(); else drawMenu(); });
observer.observe($('hero-preview')); observer.observe($('game-surface'));
window.addEventListener('orientationchange', () => { if (match) pauseGame(); });

selectHero(selectedHero, false); syncSound();
if ('serviceWorker' in navigator && /https?:/.test(location.protocol)) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('./sw.js').catch(() => {}); });
}
