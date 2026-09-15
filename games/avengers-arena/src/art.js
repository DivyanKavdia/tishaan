import { HEROES } from './engine.js';

const TAU = Math.PI * 2;
const INK = '#111725';

function polygon(c, points, fill, stroke = INK, width = 2) {
  c.beginPath();
  points.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y));
  c.closePath();
  if (fill) { c.fillStyle = fill; c.fill(); }
  if (stroke) { c.strokeStyle = stroke; c.lineWidth = width; c.lineJoin = 'round'; c.stroke(); }
}

function ellipse(c, x, y, rx, ry, fill, stroke = null, width = 2) {
  c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, TAU);
  if (fill) { c.fillStyle = fill; c.fill(); }
  if (stroke) { c.strokeStyle = stroke; c.lineWidth = width; c.stroke(); }
}

function line(c, points, color, width = 2) {
  c.beginPath(); points.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y));
  c.strokeStyle = color; c.lineWidth = width; c.lineCap = 'round'; c.lineJoin = 'round'; c.stroke();
}

function limb(c, x1, y1, x2, y2, width, color) {
  line(c, [[x1, y1], [x2, y2]], INK, width + 4);
  line(c, [[x1, y1], [x2, y2]], color, width);
  line(c, [[x1 - 2, y1], [x2 - 2, y2]], '#ffffff20', Math.max(2, width * 0.22));
}

function star(c, x, y, radius, fill) {
  polygon(c, Array.from({ length: 10 }, (_, i) => {
    const a = i * Math.PI / 5 - Math.PI / 2;
    const r = i % 2 ? radius * 0.43 : radius;
    return [x + Math.cos(a) * r, y + Math.sin(a) * r];
  }), fill, null);
}

export function drawShield(c, x, y, radius, angle = 0) {
  c.save(); c.translate(x, y); c.rotate(angle);
  ellipse(c, 0, 0, radius, radius, '#cd404a', INK, 2.2);
  ellipse(c, 0, 0, radius * 0.76, radius * 0.76, '#e6ebec');
  ellipse(c, 0, 0, radius * 0.58, radius * 0.58, '#c93843');
  ellipse(c, 0, 0, radius * 0.4, radius * 0.4, '#356bb3');
  star(c, 0, 0, radius * 0.34, '#f1f5f6');
  c.globalAlpha *= 0.13;
  polygon(c, [[-radius, 0], [0, -radius], [radius * 0.5, -radius * 0.7], [-radius * 0.7, radius * 0.5]], '#ffffff', null);
  c.restore();
}

export function drawHero(c, hero, x, y, scale = 1, facing = 1, pose = {}) {
  const h = HEROES[hero];
  const big = hero === 'hulk';
  const moving = pose.moving || 0;
  const t = pose.time || 0;
  const gait = moving ? Math.sin(t * 13) * 12 : 0;
  const bob = moving ? Math.abs(Math.sin(t * 13)) * 2 : Math.sin(t * 2.8) * 1.4;
  const attack = pose.attack;
  const progress = attack ? attack.elapsed / attack.duration : 0;
  const punch = attack?.kind === 'punch' ? Math.sin(Math.min(1, progress * 1.7) * Math.PI) : 0;
  const special = attack?.kind === 'special';
  c.save(); c.translate(x, y); c.scale(scale * facing, scale); c.translate(0, -bob);
  c.lineCap = 'round';
  if (pose.flash > 0) { c.shadowColor = '#ffffff'; c.shadowBlur = 14; }
  if (big) c.scale(1.23, 1.12);

  if (hero === 'thor') {
    polygon(c, [[-28, -96], [20, -91], [31 + gait * 0.3, -16], [-43, -9], [-37 - gait * 0.3, -59]], '#ae3349');
    polygon(c, [[-28, -93], [-16, -88], [-19, -21], [-38, -14]], '#732438', null);
    line(c, [[-20, -79], [-29, -25]], '#d55166', 2);
  }

  // Far limbs sit behind the torso for a readable three-quarter silhouette.
  const trouser = big ? h.accent : h.suit;
  limb(c, -11, -43, -13 - gait * 0.65, -23, big ? 18 : 14, trouser);
  limb(c, -13 - gait * 0.65, -23, -17 - gait, -7, big ? 15 : 12, big ? '#689b49' : hero === 'captain' ? '#934148' : h.suit);
  polygon(c, [[-25 - gait, -11], [-11 - gait, -11], [-5 - gait, 0], [-29 - gait, 0]], big ? '#75aa50' : hero === 'thor' ? '#535d76' : hero === 'captain' ? '#b54b50' : '#b53138');
  limb(c, -21, -83, -34, -62 + gait * 0.25, big ? 21 : 14, h.suit);
  limb(c, -34, -62 + gait * 0.25, -29 - gait * 0.3, -43, big ? 18 : 12, hero === 'thor' ? '#d8b299' : h.suit);
  ellipse(c, -28 - gait * 0.3, -42, big ? 13 : 9, big ? 13 : 10, big ? '#86bd5c' : hero === 'captain' ? '#ba4c52' : hero === 'thor' ? '#edc7a7' : '#c54243', INK);

  limb(c, 11, -44, 14 + gait * 0.65, -23, big ? 20 : 15, trouser);
  limb(c, 14 + gait * 0.65, -23, 18 + gait, -8, big ? 17 : 13, big ? h.suit : hero === 'captain' ? '#b34b50' : h.suit);
  polygon(c, [[10 + gait, -12], [24 + gait, -12], [32 + gait, -2], [30 + gait, 1], [8 + gait, 1]], big ? '#8bc463' : hero === 'thor' ? '#707d97' : hero === 'captain' ? '#c25455' : '#d34543');
  if (hero === 'ironman') {
    polygon(c, [[5, -43], [16, -43], [20 + gait * 0.6, -25], [10 + gait * 0.6, -25]], '#e6b55e');
    line(c, [[11 + gait, -18], [22 + gait, -18]], '#fbce80', 3);
  }

  polygon(c, big ? [[-29, -94], [24, -95], [31, -76], [21, -43], [-22, -43], [-33, -74]] : [[-23, -94], [21, -94], [27, -76], [16, -46], [-16, -46], [-27, -77]], h.suit);
  if (big) {
    ellipse(c, -14, -80, 17, 11, '#91c96a'); ellipse(c, 13, -80, 17, 11, '#a2d37c');
    line(c, [[-2, -85], [-2, -48]], '#558b3b', 2);
    line(c, [[-16, -61], [-6, -58]], '#5e963e', 2); line(c, [[5, -58], [16, -61]], '#5e963e', 2);
    polygon(c, [[-22, -46], [22, -46], [23, -29], [13, -32], [6, -27], [0, -34], [-8, -28], [-23, -32]], '#6d538d');
    line(c, [[-3, -43], [-2, -31]], '#433458', 2);
  } else if (hero === 'ironman') {
    polygon(c, [[-21, -91], [-3, -84], [19, -90], [24, -76], [13, -68], [-16, -70], [-25, -77]], '#d9514c');
    polygon(c, [[-16, -66], [15, -66], [12, -47], [-12, -47]], '#8f2c36');
    line(c, [[-12, -60], [12, -60]], '#ee9955', 2);
    c.save(); c.shadowColor = '#72e9ff'; c.shadowBlur = 16;
    ellipse(c, 1, -79, 10, 10, '#98eaff', '#405d6c', 2); ellipse(c, 1, -79, 6, 6, '#edffff'); c.restore();
    polygon(c, [[-18, -47], [17, -47], [18, -39], [-18, -39]], '#d9a34f');
  } else if (hero === 'captain') {
    polygon(c, [[-23, -91], [-13, -93], [14, -49], [7, -46]], '#7f5842');
    star(c, 2, -78, 12, '#eff3e9');
    polygon(c, [[-16, -64], [17, -64], [15, -47], [-14, -47]], '#e8eadd');
    for (const px of [-10, 1, 12]) polygon(c, [[px, -64], [px + 5, -64], [px + 4, -48], [px, -48]], '#c95254', null);
    polygon(c, [[-18, -49], [18, -49], [18, -41], [-18, -41]], '#72503b');
    polygon(c, [[-4, -49], [5, -49], [5, -41], [-4, -41]], '#c9b284', INK, 1);
  } else {
    polygon(c, [[-20, -92], [18, -92], [17, -49], [-15, -49]], '#303b51');
    for (const [px, py] of [[-11, -83], [12, -83], [-9, -65], [10, -65]]) ellipse(c, px, py, 7, 7, '#bdc8db', '#6c7c97', 2);
    line(c, [[0, -91], [0, -49]], '#8190a7', 2);
    polygon(c, [[-17, -49], [17, -49], [17, -42], [-17, -42]], '#a0aabf');
  }

  // Hair behind the head.
  if (hero === 'thor') polygon(c, [[-20, -127], [17, -129], [22, -96], [12, -91], [-24, -94]], '#dcae5d');
  limb(c, 0, -94, 1, -103, 14, big ? '#7fb556' : hero === 'ironman' ? '#ae3237' : '#d2a285');
  if (hero === 'ironman') {
    polygon(c, [[-18, -128], [-11, -138], [12, -137], [22, -127], [19, -105], [7, -97], [-11, -101], [-19, -114]], '#b33137');
    polygon(c, [[-11, -129], [-1, -126], [13, -130], [18, -121], [14, -108], [6, -102], [-9, -106], [-14, -119]], '#ebbc69');
    line(c, [[-10, -120], [-2, -118]], '#c9faff', 3); line(c, [[5, -118], [14, -121]], '#c9faff', 3);
    line(c, [[-5, -108], [7, -108]], '#6c4535', 2);
  } else if (hero === 'captain') {
    polygon(c, [[-18, -127], [-9, -138], [13, -135], [20, -123], [17, -107], [8, -101], [-9, -104], [-18, -114]], '#376ab0');
    polygon(c, [[-8, -117], [0, -119], [5, -116], [16, -119], [16, -108], [8, -101], [-7, -106]], '#e0b699');
    line(c, [[-10, -120], [-4, -120]], '#f1f4f7', 2); line(c, [[7, -121], [14, -122]], '#f1f4f7', 2);
    c.font = 'bold 13px Arial'; c.fillStyle = '#ecf4f5'; c.textAlign = 'center'; c.fillText('A', 1, -124);
    line(c, [[1, -108], [10, -108]], '#865a4e', 1.5);
  } else if (hero === 'thor') {
    polygon(c, [[-14, -128], [12, -130], [18, -119], [14, -105], [5, -99], [-11, -104], [-16, -117]], '#edc9a5');
    polygon(c, [[-16, -130], [-8, -138], [14, -133], [19, -120], [9, -128], [-6, -125], [-15, -113]], '#f1cb7b');
    polygon(c, [[-12, -112], [-2, -109], [5, -112], [14, -111], [10, -101], [1, -96], [-10, -103]], '#bf8e46', null);
    line(c, [[-9, -119], [-3, -119]], '#514a4f', 2); line(c, [[5, -119], [12, -120]], '#514a4f', 2);
  } else {
    polygon(c, [[-22, -124], [-14, -134], [14, -133], [22, -121], [19, -103], [7, -95], [-13, -99], [-23, -111]], '#94c96a');
    polygon(c, [[-22, -119], [-25, -131], [-16, -139], [-11, -136], [-6, -141], [0, -137], [8, -141], [15, -135], [21, -135], [23, -125], [16, -128], [10, -125], [1, -129], [-7, -125], [-16, -128]], '#283a32');
    line(c, [[-15, -118], [-5, -115]], '#365d34', 4); line(c, [[4, -116], [14, -119]], '#365d34', 4);
    line(c, [[-12, -113], [-6, -112]], '#f0f2c4', 2); line(c, [[5, -112], [12, -113]], '#f0f2c4', 2);
    polygon(c, [[-7, -105], [10, -106], [9, -101], [-5, -101]], '#e3e7c9', '#3b6732', 1);
  }

  let handX = 33 + punch * 54;
  let handY = -47 - punch * 29;
  if (pose.guard) { handX = 32; handY = -104; }
  if (special) { handX = hero === 'thor' ? 29 : hero === 'hulk' ? 39 : 63; handY = hero === 'thor' ? -148 : hero === 'hulk' ? -30 : -78; }
  const elbowX = 31 + punch * 17;
  const elbowY = (handY - 82) / 2 + 8;
  limb(c, 22, -85, elbowX, elbowY, big ? 23 : 15, hero === 'thor' ? '#dfb69a' : h.suit);
  limb(c, elbowX, elbowY, handX, handY, big ? 20 : 13, hero === 'thor' ? '#eac4a6' : hero === 'ironman' ? '#dfb267' : h.suit);
  ellipse(c, handX, handY, big ? 15 : 10, big ? 15 : 10, big ? '#a3d47b' : hero === 'thor' ? '#eac4a6' : hero === 'captain' ? '#c25257' : '#d84949', INK);
  if (hero === 'ironman') {
    ellipse(c, 22, -87, 11, 9, '#d9544c', INK);
    if (special) { c.save(); c.shadowColor = '#a0efff'; c.shadowBlur = 20; ellipse(c, handX + 7, handY, 6, 8, '#e3ffff'); c.restore(); }
  }
  if (hero === 'captain' && !special) drawShield(c, handX + 3, handY + 2, 28, -0.1);
  if (hero === 'thor') {
    limb(c, handX, handY + 12, handX, handY - 21, 5, '#8d654e');
    polygon(c, [[handX - 19, handY - 39], [handX + 19, handY - 39], [handX + 22, handY - 34], [handX + 20, handY - 17], [handX - 18, handY - 17], [handX - 22, handY - 23]], '#abbacc');
    polygon(c, [[handX - 17, handY - 36], [handX + 13, handY - 36], [handX + 13, handY - 22], [handX - 17, handY - 22]], '#d4dce5', null);
    line(c, [[handX + 15, handY - 34], [handX + 15, handY - 23]], '#74869f', 2);
  }
  if (pose.guard && hero !== 'captain') {
    c.globalAlpha = 0.55; c.strokeStyle = '#b9dcff'; c.lineWidth = 2;
    c.beginPath(); c.ellipse(25, -76, 36, 62, 0, -1.35, 1.35); c.stroke();
  }
  c.restore();
}

export function drawBackdrop(c, width, height, floor, time = 0) {
  const sky = c.createLinearGradient(0, 0, 0, floor);
  sky.addColorStop(0, '#101726'); sky.addColorStop(0.55, '#182038'); sky.addColorStop(1, '#374057');
  c.fillStyle = sky; c.fillRect(0, 0, width, height);
  const haze = c.createRadialGradient(width * 0.68, floor * 0.48, 5, width * 0.68, floor * 0.48, width * 0.48);
  haze.addColorStop(0, '#69548038'); haze.addColorStop(1, '#3c416000');
  c.fillStyle = haze; c.fillRect(0, 0, width, floor);
  for (let i = 0; i < 36; i++) {
    const px = (i * 173 + 59) % width, py = (i * 67 + 13) % Math.max(1, floor * 0.65);
    c.globalAlpha = 0.2 + Math.sin(i + time * 0.4) * 0.12;
    c.fillStyle = '#e6edf7'; c.fillRect(px, py, 1.6, 1.6);
  }
  c.globalAlpha = 1;
  // A fixed skyline is shared by the menu artwork and the arena.
  for (let layer = 0; layer < 2; layer++) {
    const unit = layer ? 82 : 62;
    for (let i = -1; i < width / unit + 1; i++) {
      const bh = 70 + ((i + 7) * 73 + layer * 23) % 155;
      const bx = i * unit + (layer ? 30 : 0);
      const by = floor - bh - (layer ? 0 : 18);
      c.fillStyle = layer ? '#161f31' : '#243045'; c.fillRect(bx, by, unit - 9, bh + 20);
      if (i % 3 === 0) { c.fillRect(bx + unit * 0.5, by - 24, 2, 25); }
      for (let wx = 9; wx < unit - 15; wx += 13) for (let wy = 14; wy < bh - 4; wy += 17) {
        if ((wx + wy + i * 3) % 5 !== 0) { c.fillStyle = layer ? '#a1bbd62b' : '#a7c6e222'; c.fillRect(bx + wx, by + wy, 4, 6); }
      }
    }
  }
  const tx = width * 0.69;
  polygon(c, [[tx - 29, floor], [tx - 28, floor - 207], [tx - 6, floor - 252], [tx + 34, floor - 252], [tx + 19, floor]], '#283449', '#4b586d', 1);
  line(c, [[tx - 20, floor - 216], [tx + 22, floor - 216]], '#99d9df88', 3);
  for (let i = 0; i < 8; i++) line(c, [[tx - 18, floor - 191 + i * 20], [tx + 16, floor - 191 + i * 20]], '#68849755', 2);
  c.font = 'italic bold 34px Arial'; c.textAlign = 'center'; c.fillStyle = '#a1c4d8aa'; c.fillText('A', tx + 2, floor - 224);
  c.fillStyle = '#141c2c'; c.fillRect(0, floor - 22, width, 24);
  line(c, [[0, floor - 22], [width, floor - 22]], '#91b5c143', 2);
  for (let x = 20; x < width; x += 94) { c.fillStyle = '#8eb8c36b'; c.fillRect(x, floor - 20, 33, 2); }
  const deck = c.createLinearGradient(0, floor, 0, height);
  deck.addColorStop(0, '#30394c'); deck.addColorStop(1, '#171e2c');
  c.fillStyle = deck; c.fillRect(0, floor, width, height - floor);
  c.strokeStyle = '#8394ae24'; c.lineWidth = 1;
  for (let i = -5; i < 14; i++) line(c, [[width / 2 + i * 90, floor], [width / 2 + i * 180, height]], '#8394ae20', 1);
  for (let i = 1; i < 4; i++) line(c, [[0, floor + i * i * 7], [width, floor + i * i * 7]], '#8394ae20', 1);
  ellipse(c, width / 2, floor + 40, width * 0.27, 27, null, '#d4b26b35', 2);
  c.font = 'bold 13px monospace'; c.fillStyle = '#acbdd044'; c.textAlign = 'center'; c.fillText('STARK INDUSTRIES  /  TRAINING DECK 04', width / 2, floor + 65);
}

export function drawMatch(c, match, reducedMotion = false) {
  const { width, height, floor, elapsed: t } = match;
  c.save();
  if (!reducedMotion && match.shake > 0) c.translate(Math.sin(t * 143) * match.shake, Math.cos(t * 97) * match.shake * 0.55);
  drawBackdrop(c, width, height, floor, t);
  for (const actor of [match.enemy, match.player]) {
    ellipse(c, actor.x, floor + 4, actor.hero === 'hulk' ? 49 : 38, 9, '#050c1966');
    drawHero(c, actor.hero, actor.x, floor - actor.y, 1.22, actor.facing, { ...actor, time: t });
    if (actor.id === 'player') {
      polygon(c, [[actor.x - 5, floor + 19], [actor.x + 5, floor + 19], [actor.x, floor + 13]], '#f9cd70', null);
    }
  }
  for (const p of match.projectiles) {
    if (p.kind === 'shield') drawShield(c, p.x, p.y, p.radius, t * 15);
    else if (p.kind === 'blast') {
      c.save(); c.shadowBlur = 19; c.shadowColor = '#76e5ff';
      line(c, [[p.x - Math.sign(p.vx) * 48, p.y], [p.x, p.y]], '#6ce5ff88', 13);
      ellipse(c, p.x, p.y, 21, 11, '#c3faff'); ellipse(c, p.x + Math.sign(p.vx) * 6, p.y, 9, 6, '#ffffff'); c.restore();
    } else {
      polygon(c, [[p.x - 28, floor], [p.x - 19, floor - 22], [p.x - 9, floor - 15], [p.x, floor - 49], [p.x + 14, floor - 24], [p.x + 27, floor]], '#b0e7779a', '#d8ffa4', 2);
    }
  }
  for (const e of match.effects) {
    const p = 1 - e.life / e.maxLife;
    c.save(); c.globalAlpha = Math.min(1, e.life * 6);
    if (e.kind === 'hit' || e.kind === 'block') {
      for (let i = 0; i < 9; i++) {
        const angle = i * TAU / 9 + 0.2;
        line(c, [[e.x + Math.cos(angle) * (10 + p * 18), e.y + Math.sin(angle) * (10 + p * 18)], [e.x + Math.cos(angle) * (22 + p * 40), e.y + Math.sin(angle) * (22 + p * 40)]], e.color, e.kind === 'block' ? 2 : 3);
      }
    } else if (e.kind === 'number') {
      c.font = `800 ${e.text.length > 3 ? 15 : 24}px Arial`; c.textAlign = 'center'; c.fillStyle = e.color; c.fillText(e.text, e.x, e.y - p * 27);
    } else if (e.kind === 'warning') {
      ellipse(c, e.x, e.y, 70 - p * 15, 12, '#c1a1ff18', '#bd9dff', 2);
      line(c, [[e.x, e.y - 28], [e.x, e.y - 10]], '#decfff', 3);
    } else if (e.kind === 'lightning') {
      c.shadowColor = '#d0b9ff'; c.shadowBlur = 20;
      const points = [[e.x + 13, 0], [e.x - 17, e.y * 0.22], [e.x + 9, e.y * 0.31], [e.x - 24, e.y * 0.55], [e.x + 15, e.y * 0.58], [e.x - 8, e.y * 0.8], [e.x, e.y]];
      line(c, points, '#b597ff', 13); line(c, points, '#f3eaff', 4);
      ellipse(c, e.x, e.y, 75 * (p + 0.25), 19, null, '#d7c1ff', 3);
    } else if (e.kind === 'smash') {
      ellipse(c, e.x, e.y, 200 * p + 20, 38 * p + 6, null, e.color, 4 * (1 - p) + 1);
      for (let i = 0; i < 7; i++) { const px = e.x + (i - 3) * p * 60; polygon(c, [[px, e.y], [px + 8, e.y - Math.sin(p * Math.PI) * (20 + i % 3 * 15)], [px + 17, e.y]], '#7a8c78', null); }
    }
    c.restore();
  }
  c.restore();
}
