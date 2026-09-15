export const HEROES = {
  ironman: { name: 'Iron Man', short: 'STARK', title: 'The armored Avenger', color: '#fc6655', light: '#9df6ff', suit: '#bc3436', accent: '#f3c164', health: 100, speed: 280, damage: 10, range: 116, special: 'Repulsor blast', cost: 35, power: 3, agility: 4, defense: 2 },
  captain: { name: 'Captain America', short: 'ROGERS', title: 'The first Avenger', color: '#629cff', light: '#accfff', suit: '#255ba3', accent: '#edf1ee', health: 115, speed: 255, damage: 11, range: 117, special: 'Shield throw', cost: 40, power: 3, agility: 3, defense: 4 },
  thor: { name: 'Thor', short: 'ODINSON', title: 'The god of thunder', color: '#bda3ff', light: '#dccdff', suit: '#464e67', accent: '#d6dde9', health: 110, speed: 250, damage: 12, range: 130, special: 'Lightning strike', cost: 45, power: 4, agility: 3, defense: 3 },
  hulk: { name: 'Hulk', short: 'BANNER', title: 'The strongest Avenger', color: '#a9d85e', light: '#d5ffaa', suit: '#7fbb59', accent: '#5d447e', health: 135, speed: 215, damage: 15, range: 133, special: 'Gamma smash', cost: 45, power: 5, agility: 2, defense: 4 },
};

export const DIFFICULTIES = {
  recruit: { label: 'Recruit', reaction: 0.34, aggression: 0.5, guard: 0.24, damage: 0.72 },
  hero: { label: 'Hero', reaction: 0.22, aggression: 0.76, guard: 0.5, damage: 1 },
  avenger: { label: 'Avenger', reaction: 0.13, aggression: 0.96, guard: 0.72, damage: 1.08 },
};

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

function fighter(hero, id, x, facing) {
  const spec = HEROES[hero];
  return { id, hero, x, y: 0, vy: 0, facing, hp: spec.health, energy: 100, guard: false, moving: 0, attack: null, cooldown: 0, stun: 0, invulnerable: 0, flash: 0, combo: 0, comboWindow: 0, specialBuffer: 0, strikeBuffer: 0, jumpBuffer: 0, damageDealt: 0, hits: 0 };
}

export function createMatch({ hero = 'ironman', opponent = 'thor', difficulty = 'hero', width = 1120, height = 560, random = Math.random } = {}) {
  if (!HEROES[hero] || !HEROES[opponent] || !DIFFICULTIES[difficulty]) throw new Error('Unknown match option');
  return { width, height, floor: height - 92, player: fighter(hero, 'player', width * 0.24, 1), enemy: fighter(opponent, 'enemy', width * 0.76, -1), difficulty, random, state: 'countdown', countdown: 2.7, timeLeft: 75, elapsed: 0, projectiles: [], effects: [], events: [], aiTimer: 0, aiInput: {}, winner: null, finishReason: '', shake: 0 };
}

function effect(match, kind, x, y, color, life = 0.45, extra = {}) {
  match.effects.push({ kind, x, y, color, life, maxLife: life, ...extra });
}

function damage(match, attacker, target, amount, direction, isSpecial = false) {
  if (target.hp <= 0 || target.invulnerable > 0) return false;
  const blocking = target.guard && target.energy >= 6 && target.facing === -direction;
  let actual = amount * (attacker.id === 'enemy' ? DIFFICULTIES[match.difficulty].damage : 1);
  if (blocking) {
    actual *= 0.18;
    target.energy = Math.max(0, target.energy - (isSpecial ? 18 : 9));
    target.stun = 0.035;
  } else {
    target.stun = isSpecial ? 0.22 : 0.14;
    target.attack = null;
    target.invulnerable = 0.19;
    target.flash = 0.16;
    target.x = clamp(target.x + direction * (isSpecial ? 26 : 14), 55, match.width - 55);
  }
  const dealt = Math.min(target.hp, actual);
  target.hp = Math.max(0, target.hp - dealt);
  attacker.damageDealt += dealt;
  attacker.hits += 1;
  attacker.energy = Math.min(100, attacker.energy + (isSpecial ? 0 : 4));
  match.shake = blocking ? 2 : isSpecial ? 8 : 4;
  effect(match, blocking ? 'block' : 'hit', target.x, match.floor - target.y - 67, blocking ? '#b8dbff' : HEROES[attacker.hero].light);
  effect(match, 'number', target.x, match.floor - target.y - 132, blocking ? '#b8dbff' : '#ffffff', 0.65, { text: blocking ? 'BLOCK' : String(Math.round(dealt)) });
  match.events.push({ type: blocking ? 'block' : 'hit', special: isSpecial });
  return true;
}

function startAttack(match, actor, target, special) {
  const spec = HEROES[actor.hero];
  if (actor.cooldown > 0 || actor.attack || actor.stun > 0 || actor.guard) return false;
  if (special && actor.energy < spec.cost) return false;
  if (special) actor.energy -= spec.cost;
  actor.combo = !special && actor.comboWindow > 0 ? actor.combo % 3 + 1 : 1;
  actor.comboWindow = 1.15;
  actor.attack = { kind: special ? 'special' : 'punch', elapsed: 0, fired: false, targetX: clamp(target.x, actor.x - 445, actor.x + 445), direction: actor.facing, duration: special ? 0.68 : 0.34 };
  actor.cooldown = special ? 0.96 : actor.hero === 'hulk' ? 0.52 : 0.39;
  match.events.push({ type: special ? 'special' : 'swing', hero: actor.hero });
  if (special && actor.hero === 'thor') effect(match, 'warning', actor.attack.targetX, match.floor, spec.color, 0.46);
  return true;
}

function resolveAttack(match, actor, target) {
  const attack = actor.attack;
  if (!attack || attack.fired) return;
  const special = attack.kind === 'special';
  const trigger = special ? (actor.hero === 'thor' ? 0.46 : 0.25) : 0.12;
  if (attack.elapsed < trigger) return;
  attack.fired = true;
  const spec = HEROES[actor.hero];
  const direction = attack.direction;
  if (!special) {
    if (Math.abs(target.x - actor.x) < spec.range && Math.abs(actor.y - target.y) < 85 && (target.x - actor.x) * direction > -25) {
      damage(match, actor, target, spec.damage + (actor.combo === 3 ? 4 : 0), direction);
      if (actor.combo === 3) effect(match, 'number', actor.x, match.floor - actor.y - 155, '#ffc96c', 0.75, { text: '3 HIT COMBO' });
    }
  } else if (actor.hero === 'thor') {
    effect(match, 'lightning', attack.targetX, match.floor, spec.light, 0.4);
    if (Math.abs(target.x - attack.targetX) < 76) damage(match, actor, target, 29, direction, true);
  } else if (actor.hero === 'hulk') {
    effect(match, 'smash', actor.x, match.floor - actor.y, spec.color, 0.5);
    for (const sign of [-1, 1]) match.projectiles.push({ kind: 'wave', owner: actor.id, x: actor.x, y: match.floor - 15, vx: sign * 470, life: 0.58, age: 0, radius: 23, damage: 27, hits: new Set() });
    match.shake = 8;
  } else {
    const shield = actor.hero === 'captain';
    match.projectiles.push({ kind: shield ? 'shield' : 'blast', owner: actor.id, x: actor.x + direction * 55, y: match.floor - actor.y - 69, vx: direction * (shield ? 540 : 650), life: shield ? 1.8 : 1.45, age: 0, radius: shield ? 25 : 17, damage: shield ? 25 : 24, hits: new Set(), returning: false });
  }
}

function chooseAI(match) {
  const actor = match.enemy;
  const target = match.player;
  const spec = HEROES[actor.hero];
  const level = DIFFICULTIES[match.difficulty];
  const distance = Math.abs(target.x - actor.x);
  const approaching = match.projectiles.some(p => p.owner !== actor.id && Math.abs(p.x - actor.x) < 250 && (actor.x - p.x) * p.vx > 0);
  const threatened = (target.attack && distance < 180) || approaching;
  const guard = !!(threatened && match.random() < level.guard && actor.energy > 14);
  const advance = distance > spec.range * 0.77;
  const input = { left: advance && target.x < actor.x, right: advance && target.x > actor.x, guard, attack: !guard && distance < spec.range && match.random() < level.aggression, jump: !guard && approaching && match.random() < 0.45, special: false };
  if (!guard && actor.energy >= spec.cost && match.random() < level.aggression * 0.48) {
    input.special = actor.hero === 'hulk' ? distance < 260 : distance < 460;
  }
  return input;
}

function updateFighter(match, actor, target, input, dt) {
  const spec = HEROES[actor.hero];
  for (const key of ['cooldown', 'stun', 'invulnerable', 'flash', 'comboWindow', 'specialBuffer', 'strikeBuffer', 'jumpBuffer']) actor[key] = Math.max(0, actor[key] - dt);
  // Brief taps during an attack are queued so phone controls feel responsive.
  if (input.special) actor.specialBuffer = 0.4;
  if (input.attack) actor.strikeBuffer = 0.18;
  if (input.jump) actor.jumpBuffer = 0.16;
  actor.facing = target.x >= actor.x ? 1 : -1;
  actor.guard = !!input.guard && actor.y < 1 && actor.stun <= 0 && !actor.attack && actor.energy >= 6;
  actor.energy = Math.min(100, actor.energy + dt * (actor.guard ? 2.5 : 9));
  if (actor.stun <= 0) {
    const move = Number(!!input.right) - Number(!!input.left);
    actor.moving = move;
    actor.x = clamp(actor.x + move * spec.speed * dt * (actor.guard ? 0.28 : actor.attack ? 0.35 : 1), 55, match.width - 55);
    if (actor.jumpBuffer > 0 && actor.y === 0 && !actor.guard && !actor.attack) {
      actor.vy = 620;
      actor.jumpBuffer = 0;
      match.events.push({ type: 'jump' });
    }
    if (actor.specialBuffer > 0 && actor.energy >= spec.cost) {
      if (startAttack(match, actor, target, true)) actor.specialBuffer = 0;
    } else if (actor.strikeBuffer > 0) {
      if (startAttack(match, actor, target, false)) actor.strikeBuffer = 0;
    }
  } else actor.moving = 0;
  if (actor.y > 0 || actor.vy > 0) {
    actor.vy -= 1700 * dt;
    actor.y = Math.max(0, actor.y + actor.vy * dt);
    if (actor.y === 0) actor.vy = 0;
  }
  if (actor.attack) {
    actor.attack.elapsed += dt;
    resolveAttack(match, actor, target);
    if (actor.attack && actor.attack.elapsed >= actor.attack.duration) actor.attack = null;
  }
}

function finish(match) {
  const p = match.player.hp / HEROES[match.player.hero].health;
  const e = match.enemy.hp / HEROES[match.enemy.hero].health;
  if (match.player.hp <= 0 || match.enemy.hp <= 0 || match.timeLeft <= 0) {
    match.state = 'finished';
    match.winner = Math.abs(p - e) < 0.0001 ? 'draw' : p > e ? 'player' : 'enemy';
    match.finishReason = match.timeLeft <= 0 ? 'Time’s up' : 'Knockout';
    match.events.push({ type: 'finish', winner: match.winner });
  }
}

export function stepMatch(match, input = {}, dt = 1 / 60) {
  // Clamp long frames so returning from another app cannot fast-forward a fight.
  dt = clamp(Number.isFinite(dt) ? dt : 0, 0, 0.035);
  match.events = [];
  if (match.state === 'finished') return;
  match.elapsed += dt;
  match.shake = Math.max(0, match.shake - dt * 26);
  match.effects = match.effects.filter(e => (e.life -= dt) > 0);
  if (match.state === 'countdown') {
    match.countdown -= dt;
    if (match.countdown <= 0) { match.state = 'fighting'; match.events.push({ type: 'fight' }); }
    return;
  }
  match.timeLeft = Math.max(0, match.timeLeft - dt);
  match.aiTimer -= dt;
  if (match.aiTimer <= 0) {
    match.aiInput = chooseAI(match);
    match.aiTimer = DIFFICULTIES[match.difficulty].reaction;
  }
  updateFighter(match, match.player, match.enemy, input, dt);
  updateFighter(match, match.enemy, match.player, match.aiInput, dt);
  // Separate bodies on the ground, while allowing a jump over an opponent.
  const gap = match.enemy.x - match.player.x;
  if (Math.abs(gap) < 62 && Math.abs(match.player.y - match.enemy.y) < 75) {
    const push = (62 - Math.abs(gap)) / 2 * (gap >= 0 ? 1 : -1);
    match.player.x = clamp(match.player.x - push, 55, match.width - 55);
    match.enemy.x = clamp(match.enemy.x + push, 55, match.width - 55);
  }
  for (const projectile of match.projectiles) {
    projectile.life -= dt;
    projectile.age += dt;
    const owner = projectile.owner === 'player' ? match.player : match.enemy;
    const target = projectile.owner === 'player' ? match.enemy : match.player;
    const previousX = projectile.x;
    if (projectile.kind === 'shield' && projectile.age > 0.64) {
      projectile.returning = true;
      projectile.vx = Math.sign(owner.x - projectile.x) * 630;
      projectile.y += (match.floor - owner.y - 70 - projectile.y) * dt * 6;
      if (Math.abs(owner.x - projectile.x) < 28) projectile.life = 0;
    }
    projectile.x += projectile.vx * dt;
    const horizontalHit = target.x >= Math.min(previousX, projectile.x) - 30 - projectile.radius && target.x <= Math.max(previousX, projectile.x) + 30 + projectile.radius;
    const feet = match.floor - target.y;
    const verticalHit = projectile.y > feet - (target.hero === 'hulk' ? 124 : 108) - projectile.radius && projectile.y < feet + projectile.radius;
    if (projectile.life > 0 && horizontalHit && verticalHit && !projectile.hits.has(target.id)) {
      damage(match, owner, target, projectile.damage, Math.sign(projectile.vx), true);
      projectile.hits.add(target.id);
      if (projectile.kind !== 'shield') projectile.life = 0;
    }
  }
  match.projectiles = match.projectiles.filter(p => p.life > 0 && p.x > -80 && p.x < match.width + 80);
  finish(match);
}
