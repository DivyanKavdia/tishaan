import { CandyGame, COLORS, LEVELS, SIZE, adjacent, availableMoves } from './engine.js';

const $ = id => document.getElementById(id);
const STORAGE = 'tishaan-candy-pop-v1';
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const delay = ms => new Promise(resolve => setTimeout(resolve, reduced ? 12 : ms));
const palettes = [['#ffb4ca','#f46793','#ce356b'],['#ffdb9a','#ffa444','#dd652f'],['#fff6a7','#f8d843','#dba425'],['#b4f0cc','#62d2a6','#36a782'],['#c5f0ff','#6cc7ed','#318fc4'],['#e8bbff','#bc7bd9','#8642a7']];
const shapes = [
  '<path d="M41 9C52 15 47 34 38 43S17 51 10 42 13 21 21 13 34 5 41 9Z"/>',
  '<rect x="7" y="15" width="43" height="28" rx="14" transform="rotate(-25 28 28)"/>',
  '<path d="M28 5C34 14 49 25 49 35 49 48 35 50 27 49 15 49 6 45 7 34 8 24 22 13 28 5Z"/>',
  '<rect x="8" y="8" width="40" height="40" rx="11" transform="rotate(7 28 28)"/>',
  '<path d="M24 6Q28 2 32 6L50 24Q54 28 50 32L32 50Q28 54 24 50L6 32Q2 28 6 24Z"/>',
  '<path d="M28 8C42 0 53 18 43 28 56 42 36 56 28 45 16 55 0 40 12 28 1 15 19 0 28 8Z"/>',
];

export function candySvg(candy, index) {
  const p = palettes[candy.color], special = candy.special;
  const body = special === 'rainbow' ? '<circle cx="28" cy="28" r="22"/>' : shapes[candy.color];
  let decoration = '';
  if (special === 'row' || special === 'column') decoration = `<g clip-path="url(#clip${index})" stroke="#fff" opacity=".8" stroke-width="4" transform="${special === 'column' ? 'rotate(90 28 28)' : ''}"><path d="M4 18H52M4 28H52M4 38H52"/></g>`;
  if (special === 'wrapped') decoration = '<rect x="10" y="10" width="36" height="36" rx="10" fill="none" stroke="#fff3a9" stroke-width="4"/><path d="M18 28H38M28 18V38" stroke="#fff" stroke-width="4" stroke-linecap="round"/>';
  if (special === 'rainbow') decoration = '<g><rect x="16" y="13" width="5" height="9" rx="2" fill="#ffe076" transform="rotate(-25 19 17)"/><rect x="34" y="15" width="5" height="8" rx="2" fill="#fd92bb" transform="rotate(30 36 18)"/><rect x="24" y="26" width="5" height="8" rx="2" fill="#83e4c9" transform="rotate(50 26 30)"/><rect x="12" y="32" width="5" height="8" rx="2" fill="#bc9aff"/><rect x="33" y="35" width="5" height="8" rx="2" fill="#91d9ff" transform="rotate(-30 36 39)"/><circle cx="41" cy="28" r="2" fill="#ffe284"/></g>';
  return `<svg class="candy" viewBox="0 0 56 56" aria-hidden="true"><defs><linearGradient id="c${index}" x1="0" y1="0" x2=".75" y2="1" gradientUnits="objectBoundingBox"><stop stop-color="${special === 'rainbow' ? '#aa7d9b' : p[0]}"/><stop offset=".5" stop-color="${special === 'rainbow' ? '#754661' : p[1]}"/><stop offset="1" stop-color="${special === 'rainbow' ? '#482d47' : p[2]}"/></linearGradient><clipPath id="clip${index}">${body}</clipPath></defs><g fill="url(#c${index})" stroke="${special === 'rainbow' ? '#63405a' : p[2]}" stroke-width="1.3">${body}</g><g clip-path="url(#clip${index})"><ellipse cx="21" cy="15" rx="17" ry="9" fill="#fff" opacity=".18"/><path d="M7 34Q28 54 48 32L48 49H7Z" fill="#44152b" opacity=".13"/><ellipse cx="30" cy="43" rx="13" ry="3" fill="#fff" opacity=".22"/></g>${decoration}<path d="M17 18Q22 11 29 13" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".6"/></svg>`;
}

let progress = { difficulty:'relaxed', unlocked: 0, stars: {}, best: {}, sound: true, active: null };
try {
  const saved = JSON.parse(localStorage.getItem(STORAGE));
  if (saved && Number.isInteger(saved.unlocked) && saved.unlocked >= 0 && saved.unlocked < LEVELS.length) {
    progress.unlocked = saved.unlocked;
    for (const key of ['stars', 'best']) if (saved[key] && typeof saved[key] === 'object') {
      for (let i = 0; i < LEVELS.length; i++) if (Number.isFinite(saved[key][i]) && saved[key][i] >= 0) progress[key][i] = key === 'stars' ? Math.min(3, Math.floor(saved[key][i])) : Math.min(1e8, Math.floor(saved[key][i]));
    }
    progress.sound = saved.sound !== false;
    if(['relaxed','classic','expert'].includes(saved.difficulty))progress.difficulty=saved.difficulty;
    progress.active = saved.active;
  }
} catch { /* The game remains playable when browser storage is unavailable. */ }
$('challenge').value=progress.difficulty;
$('challenge').onchange=()=>{progress.difficulty=$('challenge').value;startLevel(game.level);};
const restored = progress.active?.level <= progress.unlocked ? CandyGame.restore(progress.active) : null;
let game = restored || new CandyGame(progress.unlocked,Math.random,progress.difficulty);
// Resume an older board with its original challenge, including classic v1 saves.
progress.difficulty=game.difficulty;
$('challenge').value=game.difficulty;
let selected = null, hammer = false, busy = false, started = false, focusIndex = 0, pointer = null, audioContext;
let hintTimer, messageTimer, primaryAction = () => {}, secondaryAction = () => {}, closeAction = () => {};

function save() {
  progress.active = game.status === 'playing' ? game.snapshot() : null;
  try { localStorage.setItem(STORAGE, JSON.stringify(progress)); } catch { /* No storage is required to play. */ }
}
function sound(kind = 'pop', chain = 1) {
  if (!progress.sound) return;
  try {
    audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    if (audioContext.state === 'suspended') void audioContext.resume().catch(() => {});
    const notes = kind === 'win' ? [523,659,784,1047] : kind === 'swap' ? [390] : [Math.min(950, 450 + chain * 95), Math.min(1200, 650 + chain * 90)];
    notes.forEach((frequency, i) => {
      const start = audioContext.currentTime + i * .075, oscillator = audioContext.createOscillator(), gain = audioContext.createGain();
      oscillator.type = 'sine'; oscillator.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(0, start); gain.gain.linearRampToValueAtTime(.07, start + .01); gain.gain.exponentialRampToValueAtTime(.001, start + .17);
      oscillator.connect(gain); gain.connect(audioContext.destination); oscillator.start(start); oscillator.stop(start + .18);
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
    });
  } catch { /* Sound is optional on browsers without Web Audio. */ }
}
function message(text) { clearTimeout(messageTimer); $('message').textContent = text; }
function clearHint() { clearTimeout(hintTimer); document.querySelectorAll('.hint').forEach(el => el.classList.remove('hint')); }
function planHint() {
  clearHint();
  hintTimer = setTimeout(() => { if (!busy && !hammer && selected === null && started && !$('modal').open && !document.hidden) showHint(false); }, 6500);
}
function renderBoard(board = game.board, jelly = game.jelly) {
  const focused = document.activeElement?.closest?.('.cell')?.dataset.index;
  $('board').innerHTML = board.map((c, i) => `<button class="cell${jelly[i] ? ' jelly' : ''}${jelly[i]>1?' double-jelly':''}${selected === i ? ' selected' : ''}" data-index="${i}" tabindex="${i === focusIndex ? 0 : -1}" aria-label="Row ${Math.floor(i / SIZE) + 1}, column ${i % SIZE + 1}: ${c.special === 'rainbow' ? 'Rainbow candy bomb' : `${COLORS[c.color]} candy${c.special ? `, ${c.special} special` : ''}`}${jelly[i] ? ', jelly underneath' : ''}" aria-pressed="${selected === i}">${candySvg(c, i)}</button>`).join('');
  $('board').classList.toggle('hammer-mode', hammer);
  if (focused !== undefined) $('board').children[Number(focused)]?.focus({ preventScroll: true });
}
function renderStats(score = game.score, jelly = game.jelly) {
  $('score').textContent = score.toLocaleString('en');
  $('moves').textContent = game.moves;
  $('moves').parentElement.classList.toggle('low', game.moves <= 5 && game.status === 'playing');
  $('level-number').textContent = game.level + 1;
  $('world-name').textContent = game.rules.name;
  $('journey').textContent = game.rules.name;
  $('journey-count').textContent = `${String(game.level + 1).padStart(2, '0')} / ${LEVELS.length}`;
  $('goal').textContent = `Reach ${game.rules.target.toLocaleString('en')} points`;
  const remaining = jelly.reduce((a, b) => a + b, 0);
  $('jelly-goal').hidden = !game.rules.jelly;
  $('jelly-goal').textContent = `◇ ${remaining} jelly left`;
  $('goal-check').hidden = score < game.rules.target || game.collectionLeft>0 || remaining>0;
  $('collection-goal').hidden=!game.rules.collectTarget;
  $('collection-goal').textContent=game.rules.collectTarget?`${COLORS[game.rules.collectColor]} recipe · ${game.rules.collectTarget-game.collectionLeft}/${game.rules.collectTarget}`:'';
  $('progress').style.width = `${Math.min(100, score / game.rules.target * 100)}%`;
  const bar = $('progress').parentElement;
  bar.setAttribute('aria-valuemax', game.rules.target); bar.setAttribute('aria-valuenow', Math.min(score, game.rules.target));
  const stars = [1, 1.35, 1.8].filter(r => score >= game.rules.target * r).length;
  [...$('stars').children].forEach((el, i) => el.classList.toggle('earned', i < stars));
  $('stars').setAttribute('aria-label', `${stars} of 3 stars`);
  $('hammer-count').textContent = game.boosters.hammer;
  $('shuffle-count').textContent = game.boosters.shuffle;
  $('hammer').setAttribute('aria-pressed', String(hammer));
  for (const id of ['hint', 'hammer', 'shuffle', 'restart', 'map', 'map-side', 'help']) $(id).disabled = busy || (['hammer', 'shuffle'].includes(id) && !game.boosters[id]);
  $('sound').setAttribute('aria-pressed', String(progress.sound));
  $('sound').setAttribute('aria-label', progress.sound ? 'Turn sound off' : 'Turn sound on');
  $('sound').textContent = progress.sound ? '♫' : '♪';
  const start = Math.floor(game.level / 6) * 6;
  $('trail').innerHTML = Array.from({ length: 6 }, (_, i) => `<i class="${i + start === game.level ? 'current' : progress.stars[i + start] ? 'done' : ''}"></i>`).join('');
}
function cheer(text, points) {
  $('celebration').innerHTML = `<div class="cheer">${text}<small>+${points.toLocaleString('en')}</small></div>` + (reduced ? '' : Array.from({ length: 18 }, (_, i) => `<i class="confetti" style="--color:${palettes[i % 6][1]};--x:${Math.cos(i * 2.4) * (90 + i * 7)}px;--y:${Math.sin(i * 2.4) * (80 + i * 8)}px"></i>`).join(''));
}
async function swapArt(a, b, invalid = false) {
  const cells = $('board').children;
  const ra = cells[a].getBoundingClientRect(), rb = cells[b].getBoundingClientRect();
  const dx = rb.x - ra.x, dy = rb.y - ra.y;
  const animations = [a, b].map((i, k) => cells[i].firstElementChild.animate(
    invalid ? [{ transform: 'translate(0,0)' }, { transform: `translate(${dx * (k ? -1 : 1)}px,${dy * (k ? -1 : 1)}px)`, offset: .45 }, { transform: 'translate(0,0)' }] : [{ transform: `translate(${-dx * (k ? -1 : 1)}px,${-dy * (k ? -1 : 1)}px)` }, { transform: 'translate(0,0)' }],
    { duration: reduced ? 1 : invalid ? 320 : 170, easing: 'ease-in-out' }));
  await Promise.all(animations.map(a => a.finished.catch(() => {})));
}
function recordResult() {
  if (game.status === 'won') {
    progress.unlocked = Math.max(progress.unlocked, Math.min(LEVELS.length - 1, game.level + 1));
    progress.stars[game.level] = Math.max(progress.stars[game.level] || 0, game.stars);
    progress.best[game.level] = Math.max(progress.best[game.level] || 0, game.score);
  }
  save();
}
async function animate(result) {
  clearHint(); selected = null; hammer = false; busy = true;
  renderStats(game.score - result.frames.filter(f => f.type === 'clear').reduce((sum, f) => sum + f.earned, 0));
  // Persist the settled state before animations so an app switch cannot lose a move or win.
  recordResult();
  try {
    for (const frame of result.frames) {
      if (frame.type === 'swap') {
        renderBoard(frame.board, frame.jelly); sound('swap'); await swapArt(...frame.cells);
      } else if (frame.type === 'clear') {
        renderBoard(frame.board, frame.jelly); renderStats(frame.score, frame.jelly);
        frame.cells.forEach(i => $('board').children[i].classList.add('popping'));
        sound('pop', frame.chain);
        if (frame.chain >= 2 || frame.label || frame.creations.length) cheer(frame.label || (frame.chain >= 4 ? 'Sugar rush!' : frame.chain >= 3 ? 'Delicious!' : frame.creations.length ? 'Sweet magic!' : 'Sweet!'), frame.earned);
        message(`${frame.earned} points${frame.chain > 1 ? ` · ${frame.chain}× cascade` : ''}${frame.creations.length ? ' · Special candy created!' : ''}`);
        await delay(220);
      } else if (frame.type === 'fall') {
        renderBoard(frame.board, frame.jelly);
        frame.falls.forEach(({ to, distance }) => { const el = $('board').children[to]; el.style.setProperty('--fall', Math.min(distance, 4)); el.classList.add('falling'); });
        await delay(290);
      } else if (frame.type === 'shuffle') {
        renderBoard(frame.board, frame.jelly);
        [...$('board').children].forEach(el => el.classList.add('shuffling'));
        message('A fresh mix! Your score and moves stay safe.'); await delay(400);
      }
    }
  } finally {
    busy = false; renderBoard(); renderStats(); save();
    if (game.status !== 'playing') { await delay(350); showResult(); }
    else { planHint(); messageTimer = setTimeout(() => message(game.jellyLeft ? 'Match candies over the pink jelly to clear it.' : 'Sweet! Keep matching to reach your target.'), 2000); }
  }
}
const canPlay = () => started && !busy && !$('modal').open && game.status === 'playing';
async function attempt(a, b) {
  if (!canPlay()) return;
  clearHint(); selected = null;
  const result = game.play(a, b);
  if (result.accepted) await animate(result);
  else if (adjacent(a, b)) {
    busy = true; renderBoard(); renderStats(); await swapArt(a, b, true); busy = false; renderStats();
    message('Try a different swap. Match 3 to use a move.'); planHint();
  }
}
function choose(index) {
  if (!canPlay()) return;
  clearHint(); focusIndex = index;
  if (hammer) { void animate(game.boost('hammer', index)); return; }
  if (selected === index) selected = null;
  else if (selected !== null && adjacent(selected, index)) { void attempt(selected, index); return; }
  else selected = index;
  renderBoard(); planHint();
}
function showHint(explicit = true) {
  if (!canPlay()) return;
  clearHint();
  const moves = availableMoves(game.board);
  if (!moves.length) return;
  const hint = moves.find(([a, b]) => game.board[a].special || game.board[b].special) || moves[0];
  hint.forEach(i => $('board').children[i].classList.add('hint'));
  if (explicit) message('Swap the two sparkling candies. Hints are always free.');
}

$('board').addEventListener('pointerdown', event => {
  if (!canPlay() || !event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return;
  const cell = event.target.closest('.cell'); if (!cell) return;
  pointer = { index: Number(cell.dataset.index), x: event.clientX, y: event.clientY, id: event.pointerId };
  $('board').setPointerCapture(event.pointerId);
});
$('board').addEventListener('pointerup', event => {
  if (!pointer || event.pointerId !== pointer.id) return;
  const start = pointer; pointer = null;
  if ($('board').hasPointerCapture(event.pointerId)) $('board').releasePointerCapture(event.pointerId);
  const dx = event.clientX - start.x, dy = event.clientY - start.y;
  if (Math.max(Math.abs(dx), Math.abs(dy)) > 14 && !hammer) {
    const next = start.index + (Math.abs(dx) > Math.abs(dy) ? Math.sign(dx) : Math.sign(dy) * SIZE);
    if (adjacent(start.index, next)) void attempt(start.index, next);
  } else choose(start.index);
});
$('board').addEventListener('pointercancel', () => { pointer = null; });
$('board').addEventListener('lostpointercapture', () => { pointer = null; });
$('board').addEventListener('click', event => {
  // Keyboard and assistive-technology activation have no pointer event.
  if (event.detail === 0) { const cell = event.target.closest('.cell'); if (cell) choose(Number(cell.dataset.index)); }
});
$('board').addEventListener('keydown', event => {
  if (!canPlay()) return;
  const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -SIZE, ArrowDown: SIZE }[event.key];
  if (step) {
    event.preventDefault();
    const current = Number(event.target.closest('.cell')?.dataset.index ?? focusIndex), next = current + step;
    if (adjacent(current, next)) {
      if (event.shiftKey) void attempt(current, next);
      else { focusIndex = next; [...$('board').children].forEach((el, i) => { el.tabIndex = i === next ? 0 : -1; }); $('board').children[next].focus(); }
    }
  } else if (event.key === 'Escape') { selected = null; hammer = false; renderBoard(); renderStats(); }
});
$('hint').addEventListener('click', () => { if (canPlay()) { hammer = false; selected = null; renderBoard(); renderStats(); showHint(); } });
$('hammer').addEventListener('click', () => {
  if (!canPlay()) return;
  hammer = !hammer; selected = null; clearHint(); renderBoard(); renderStats();
  message(hammer ? 'Tap any candy to pop it. Tap Pop one again to cancel.' : 'Swipe a candy to make your next match.');
});
$('shuffle').addEventListener('click', () => { if (canPlay()) void animate(game.boost('shuffle')); });
$('sound').addEventListener('click', () => { progress.sound = !progress.sound; renderStats(); save(); if (progress.sound) sound('swap'); });

function closeModal() { $('modal').close(); closeAction(); planHint(); }
function modal({ title, kicker, art = '✦', content, primary = 'Let’s play →', action, secondary, secondaryLabel = 'Level map', onClose }) {
  clearHint();
  $('modal-title').textContent = title; $('modal-kicker').textContent = kicker || 'A LITTLE MORE MAGIC';
  $('modal-art').textContent = art; $('modal-art').className = `modal-art${game.status === 'won' ? ' won' : ''}`;
  $('modal-content').innerHTML = content;
  $('modal-primary').textContent = primary; $('modal-primary').hidden = !primary;
  $('modal-secondary').textContent = secondaryLabel; $('modal-secondary').hidden = !secondary;
  primaryAction = action || closeModal; secondaryAction = secondary || closeModal;
  closeAction = onClose || (() => {});
  if (!$('modal').open) $('modal').showModal();
}
$('modal-primary').addEventListener('click', () => { sound('swap'); primaryAction(); });
$('modal-secondary').addEventListener('click', () => secondaryAction());
$('modal-close').addEventListener('click', closeModal);
$('modal').addEventListener('cancel', event => { event.preventDefault(); closeModal(); });
function startLevel(level) {
  game = new CandyGame(level,Math.random,progress.difficulty); selected = null; hammer = false; focusIndex = 0; started = true;
  $('celebration').innerHTML = ''; renderBoard(); renderStats(); save();
  if ($('modal').open) $('modal').close();
  message(game.jellyLeft ? 'Match over pink jelly and reach your score target.' : 'Swipe a candy to match 3 of the same kind.'); planHint();
}
function showMap() {
  if (busy) return;
  modal({ title: 'Your candy trail', kicker: 'ONE SWEET STEP AT A TIME', art: '⚑', primary: 'Back to game', onClose: () => { started = true; },
    content: '<p>Six sweet worlds. How far will you go?</p><div class="level-grid">' + LEVELS.map((level, i) => `<button class="level-choice${i === game.level ? ' current' : ''}" data-level="${i}" ${i > progress.unlocked ? 'disabled' : ''} aria-label="Level ${i + 1}, ${level.name}${i > progress.unlocked ? ', locked' : ''}">${i + 1}<small>${progress.stars[i] ? '★'.repeat(progress.stars[i]) : i > progress.unlocked ? '•' : '—'}</small></button>`).join('') + '</div>' });
  $('modal-content').querySelectorAll('[data-level]').forEach(el => el.addEventListener('click', () => {
    const level = Number(el.dataset.level);
    if (level === game.level && game.status === 'playing') { started = true; closeModal(); return; }
    if (level <= progress.unlocked) startLevel(level);
  }));
}
$('map').addEventListener('click', showMap); $('map-side').addEventListener('click', showMap);
$('restart').addEventListener('click', () => {
  if (busy) return;
  modal({ title: 'A fresh start?', art: '↻', content: '<p>Restart this level with a new board, all your moves, and two of each booster.</p>', primary: 'Restart level', action: () => startLevel(game.level), secondary: closeModal, secondaryLabel: 'Keep playing' });
});
$('help').addEventListener('click', () => modal({ title: 'Small swaps. Big magic.', kicker: 'HOW TO PLAY',
  content: '<div class="tutorial"><div><b>Swipe</b> a candy into its neighbor, or tap two neighbors. Match <b>3 of the same kind</b>.</div><div><b>4 in a line</b> makes a striped candy. <b>L or T</b> makes a wrapped candy. <b>5 in a line</b> makes a rainbow bomb.</div><div>Match a special candy to activate it. Swap a <b>rainbow</b> with any color, or combine <b>two specials</b>!</div><div>Reach the score target before moves run out. When you see <b>pink jelly</b>, match on every jelly tile too.</div><div>Recipe levels also ask you to collect a specific candy color. The goal is shown above the board.</div><div><b>Hint</b> is free. <b>Pop one</b> and <b>Shuffle</b> never cost a move. You get two of each per level.</div><div>Keyboard: arrows to move focus, Space or Enter to select. Hold Shift + an arrow to swap.</div></div>', primary: 'Got it!', onClose: () => { started = true; } }));
function showResult() {
  const won = game.status === 'won';
  if (won) sound('win');
  const last = game.level === LEVELS.length - 1;
  modal({ title: won ? last ? 'You’re a candy champion!' : 'Oh, so sweet!' : 'One more sweet try?', kicker: won ? `LEVEL ${game.level + 1} COMPLETE` : 'OUT OF MOVES', art: won ? '★' : '♡',
    content: `${won ? `<div class="result-stars" aria-label="${game.stars} stars">${'★'.repeat(game.stars)}${'☆'.repeat(3 - game.stars)}</div>` : ''}<p>${won ? last ? 'You made it through all 36 levels! Replay your favorites to collect more stars.' : 'A delicious win. The next stop on your candy trail is ready!' : 'A new board could be your lucky one. There’s no waiting to play again.'}</p><div class="target-card"><span><b>${game.score.toLocaleString('en')}</b><br>points</span><span><b>${won ? game.moves : game.jellyLeft || '—'}</b><br>${won ? 'moves left' : 'jelly left'}</span></div>`,
    primary: won && !last ? `Play level ${game.level + 2} →` : won ? 'Explore the level map' : 'Try again →',
    action: () => won && last ? showMap() : startLevel(won ? game.level + 1 : game.level), secondary: showMap,
    onClose: () => { message('Use the level menu or restart to play again.'); } });
}
document.addEventListener('visibilitychange', () => { if (document.hidden) { clearHint(); save(); audioContext?.suspend().catch(() => {}); } else planHint(); });
window.addEventListener('pagehide', save);
renderBoard(); renderStats();
modal({ title: restored ? 'Welcome back, sweet tooth.' : 'Hello, sweet tooth.', kicker: restored ? 'YOUR SWEET ADVENTURE CONTINUES' : 'LET’S MAKE SOME MAGIC',
  content: `<p>${restored ? 'Your candy board is right where you left it.' : 'Swap colorful candies, make magical matches, and follow a trail of 36 sweet puzzles.'}</p><div class="target-card"><span><b>Level ${game.level + 1}</b><br>${game.rules.name}</span><span><b>${game.rules.target.toLocaleString('en')}</b><br>point target</span></div><p>Swipe to match <b>3 of the same kind</b>.</p>`,
  primary: restored ? 'Keep playing →' : 'Let’s play →', onClose: () => { started = true; save(); } });

if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(() => {});
