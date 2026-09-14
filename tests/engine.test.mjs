import test from 'node:test';
import assert from 'node:assert/strict';
import { HEROES, createMatch, stepMatch } from '../src/engine.js';

function practice(hero = 'ironman', opponent = 'captain') {
  const match = createMatch({ hero, opponent });
  match.state = 'fighting';
  match.aiTimer = Infinity;
  match.aiInput = {};
  match.player.x = 350;
  match.enemy.x = 435;
  return match;
}

function advance(match, seconds, input = {}) {
  for (let i = 0; i < Math.ceil(seconds * 60); i++) stepMatch(match, input, 1 / 60);
}

test('countdown prevents movement and damage, then starts the round', () => {
  const match = createMatch();
  const start = match.player.x;
  advance(match, 2, { right: true, special: true });
  assert.equal(match.player.x, start);
  assert.equal(match.player.energy, 100);
  assert.equal(match.timeLeft, 75);
  advance(match, 1);
  assert.equal(match.state, 'fighting');
  assert.ok(match.timeLeft < 75 && match.timeLeft > 74);
});

test('melee must connect at close range', () => {
  const near = practice();
  const far = practice();
  far.enemy.x = 900;
  advance(near, 0.35, { attack: true });
  advance(far, 0.35, { attack: true });
  assert.ok(near.enemy.hp < HEROES.captain.health);
  assert.equal(far.enemy.hp, HEROES.captain.health);
});

test('guard substantially reduces damage and consumes energy', () => {
  const exposed = practice();
  const guarded = practice();
  guarded.aiInput = { guard: true };
  advance(guarded, 0.1);
  advance(exposed, 0.35, { attack: true });
  advance(guarded, 0.35, { attack: true });
  const fullDamage = HEROES.captain.health - exposed.enemy.hp;
  const blockedDamage = HEROES.captain.health - guarded.enemy.hp;
  assert.ok(blockedDamage > 0 && blockedDamage < fullDamage * 0.3);
  assert.ok(guarded.enemy.energy < 100);
});

for (const hero of Object.keys(HEROES)) {
  test(`${HEROES[hero].name}'s special spends energy and damages the opponent`, () => {
    const match = practice(hero, 'hulk');
    match.enemy.x = hero === 'hulk' ? 500 : 615;
    stepMatch(match, { special: true });
    assert.equal(match.player.energy, 100 - HEROES[hero].cost);
    advance(match, 1.3);
    assert.ok(match.enemy.hp < HEROES.hulk.health, 'Special should reach the target');
    assert.ok(match.player.energy >= 0 && match.player.energy <= 100);
  });
}

test('specials cannot be fired with insufficient energy', () => {
  const match = practice();
  match.player.energy = 0;
  advance(match, 0.7, { special: true });
  assert.equal(match.enemy.hp, HEROES.captain.health);
  assert.equal(match.projectiles.length, 0);
  assert.ok(match.player.energy > 0);
});

test('a quick special tap during a punch is queued until the punch finishes', () => {
  const match = practice();
  stepMatch(match, { attack: true });
  advance(match, 0.15);
  stepMatch(match, { special: true });
  advance(match, 0.4);
  assert.ok(match.player.energy < 85, 'Buffered special should spend energy after recovery');
  assert.equal(match.player.attack?.kind, 'special');
});

test('jumping clears a ground shockwave', () => {
  const match = practice('hulk', 'captain');
  match.enemy.x = 510;
  stepMatch(match, { special: true });
  advance(match, 0.17);
  match.aiInput = { jump: true };
  advance(match, 0.6);
  assert.equal(match.enemy.hp, HEROES.captain.health);
});

test('fighters remain inside the arena and settle after a jump', () => {
  const match = practice();
  advance(match, 10, { left: true });
  assert.equal(match.player.x, 55);
  stepMatch(match, { jump: true });
  assert.ok(match.player.y > 0);
  advance(match, 1);
  assert.equal(match.player.y, 0);
  assert.equal(match.player.vy, 0);
});

test('time-out compares health percentages, allowing a fair Hulk matchup', () => {
  const match = practice('ironman', 'hulk');
  match.timeLeft = 0.01;
  match.player.hp = 70;
  match.enemy.hp = 80;
  stepMatch(match);
  assert.equal(match.state, 'finished');
  assert.equal(match.winner, 'player');
  assert.equal(match.finishReason, 'Time’s up');
});

test('equal health percentages produce a draw', () => {
  const match = practice('ironman', 'hulk');
  match.timeLeft = 0.01;
  stepMatch(match);
  assert.equal(match.winner, 'draw');
});

test('a knockout ends the match and no further damage can be dealt', () => {
  const match = practice();
  match.enemy.hp = 1;
  advance(match, 0.3, { attack: true });
  assert.equal(match.winner, 'player');
  assert.equal(match.state, 'finished');
  const time = match.timeLeft;
  const hp = match.player.hp;
  advance(match, 5, { attack: true, special: true });
  assert.equal(match.timeLeft, time);
  assert.equal(match.player.hp, hp);
  assert.equal(match.enemy.hp, 0);
});

test('all 48 hero and difficulty matchups remain finite and can finish', () => {
  for (const hero of Object.keys(HEROES)) for (const opponent of Object.keys(HEROES)) for (const difficulty of ['recruit', 'hero', 'avenger']) {
    let seed = 12;
    const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    const match = createMatch({ hero, opponent, difficulty, random, width: 600 });
    for (let i = 0; i < 4800 && match.state !== 'finished'; i++) {
      const delta = match.enemy.x - match.player.x;
      stepMatch(match, { left: delta < -75, right: delta > 75, attack: i % 120 < 90, special: i % 120 >= 90 });
      for (const actor of [match.player, match.enemy]) for (const key of ['hp', 'energy', 'x', 'y']) assert.ok(Number.isFinite(actor[key]), `${hero}/${opponent}/${difficulty}: ${key}`);
    }
    assert.equal(match.state, 'finished', `${hero}/${opponent}/${difficulty} did not finish`);
    assert.ok(['player', 'enemy', 'draw'].includes(match.winner));
  }
});

test('invalid frame times cannot fast-forward or corrupt a match', () => {
  const match = practice();
  stepMatch(match, {}, 600);
  assert.ok(match.timeLeft > 74.9);
  const time = match.timeLeft;
  stepMatch(match, {}, NaN);
  stepMatch(match, {}, -1);
  assert.equal(match.timeLeft, time);
});
