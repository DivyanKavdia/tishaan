import test from 'node:test';
import assert from 'node:assert/strict';
import { CandyGame, LEVELS, findMatches, availableMoves, validSwap } from '../games/candy-pop/engine.js';

const rng = seed => () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
const board = () => Array.from({ length: 64 }, (_, i) => ({ color: (i % 8 + Math.floor(i / 8) * 2) % 6, special: null }));
function fixture() { const game = new CandyGame(6, rng(123)); game.board = board(); game.jelly.fill(0); return game; }
function place(game, indices, color = 0, special = null) { indices.forEach(i => { game.board[i] = { color, special }; }); }
const firstClear = result => result.frames.find(f => f.type === 'clear');

test('every level starts settled and playable across random seeds', () => {
  for (let level = 0; level < LEVELS.length; level++) for (let seed = 1; seed <= 25; seed++) {
    const game = new CandyGame(level, rng(seed));
    assert.equal(findMatches(game.board).length, 0);
    assert.ok(availableMoves(game.board).length);
    assert.equal(game.jellyLeft, LEVELS[level].jelly);
  }
});
test('invalid swaps, diagonal moves, row wrap, and invalid boosts change nothing', () => {
  const game = fixture(), before = game.snapshot();
  for (const [a, b] of [[7,8],[0,9],[-1,0],[0,64],[0,1]]) assert.equal(game.play(a,b).accepted, false);
  assert.equal(game.boost('hammer', 64).accepted, false);
  assert.equal(game.boost('shuffle-other').accepted, false);
  assert.deepEqual(game.snapshot(), before);
});
test('matching three consumes one move, scores, clears jelly, and refills', () => {
  const game = fixture(); place(game, [0,2,9]); game.jelly[0] = 1;
  const result = game.play(1,9);
  assert.ok(result.accepted); assert.equal(game.moves, game.rules.moves - 1);
  assert.ok(game.score >= 120); assert.equal(game.jelly[0], 0);
  assert.ok(game.board.every(Boolean)); assert.equal(findMatches(game.board).length, 0);
});
test('four in a line creates a stripe; five creates a rainbow at the swapped destination', () => {
  for (const [cells, expected] of [[[0,2,3,9], 'row'], [[0,2,3,4,9], 'rainbow']]) {
    const game = fixture(); place(game, cells);
    const result = game.play(9,1);
    assert.ok(result.accepted);
    const created = firstClear(result).creations;
    assert.ok(created.some(c => c.candy.special === expected && c.index === 1));
  }
  const game = fixture(); place(game, [0,16,24,9]); game.board[8].color = 4;
  assert.equal(firstClear(game.play(9,8)).creations[0].candy.special, 'column');
});
test('an L or T intersection creates a wrapped candy', () => {
  const game = fixture(); place(game, [9,11,18,26,2]); game.board[10].color = 5;
  assert.equal(findMatches(game.board).length, 0);
  const matched = firstClear(game.play(2,10));
  assert.ok(matched.creations.some(c => c.candy.special === 'wrapped'));
});
test('a matched stripe clears its full row and triggers other specials', () => {
  const game = fixture(); place(game, [0,2,9]); game.board[0].special = 'row'; game.board[6].special = 'column';
  const cleared = firstClear(game.play(1,9)).cells;
  for (let i = 0; i < 8; i++) { assert.ok(cleared.includes(i)); assert.ok(cleared.includes(i * 8 + 6)); }
});
test('rainbow bomb selects the swapped color; double bombs clear the board', () => {
  const game = fixture(); game.board[0].special = 'rainbow';
  const color = game.board[1].color;
  const expected = game.board.flatMap((c,i) => c.color === color ? [i] : []);
  const clear = firstClear(game.play(0,1));
  for (const i of expected) assert.ok(clear.cells.includes(i));
  assert.equal(clear.cells.length, new Set([...expected,0,1]).size);
  const both = fixture(); both.board[0].special = both.board[1].special = 'rainbow';
  assert.equal(firstClear(both.play(0,1)).cells.length, 64);
});
test('special combinations work without a normal match', () => {
  const game = fixture(); game.board[27].special = 'row'; game.board[28].special = 'column';
  assert.ok(validSwap(game.board,27,28));
  const clear = firstClear(game.play(27,28));
  assert.ok(clear.cells.length >= 15);
  const wrapped = fixture(); wrapped.board[27].special = wrapped.board[28].special = 'wrapped';
  assert.ok(firstClear(wrapped.play(27,28)).cells.length >= 25);
});
test('boosters are finite, do not cost moves, and keep jelly in its board position', () => {
  const game = fixture(); game.jelly[10] = 1;
  const moves = game.moves; assert.ok(game.boost('hammer',10).accepted);
  assert.equal(game.jelly[10],0); assert.equal(game.moves,moves);
  game.jelly[4] = 1;
  const score = game.score;
  assert.ok(game.boost('shuffle').accepted); assert.equal(game.jelly[4],1);
  assert.equal(game.score,score); assert.equal(game.moves,moves);
  assert.ok(game.boost('shuffle').accepted); assert.equal(game.boost('shuffle').accepted,false);
  assert.equal(findMatches(game.board).length,0); assert.ok(availableMoves(game.board).length);
});
test('a final move can win; score alone cannot win with jelly left', () => {
  const win = fixture(); place(win,[0,2,9]); win.moves = 1; win.score = win.rules.target - 40;
  win.play(1,9); assert.equal(win.status,'won');
  assert.equal(win.play(...availableMoves(win.board)[0]).accepted,false);
  const loss = fixture(); loss.moves = 1; loss.score = 0;
  // This three-candy move does not reach the much higher level-seven target.
  place(loss,[0,2,9]); loss.play(1,9); assert.equal(loss.status,'lost');
  const jelly = fixture(); jelly.score = jelly.rules.target; jelly.jelly[63] = 1;
  jelly.boost('hammer',0); assert.equal(jelly.status,'playing');
});
test('saved games round trip; malformed and unsettled saved boards are rejected', () => {
  const game = new CandyGame(7, rng(42)); game.play(...availableMoves(game.board)[0]);
  if (game.status === 'playing') assert.deepEqual(CandyGame.restore(game.snapshot()).snapshot(),game.snapshot());
  for (const corrupt of [null,{}, {...game.snapshot(), moves:-2},{...game.snapshot(),board:[]},{...game.snapshot(),boosters:{hammer:999,shuffle:2}}]) assert.equal(CandyGame.restore(corrupt),null);
  const matched = fixture(); place(matched,[0,1,2]); assert.equal(CandyGame.restore(matched.snapshot()),null);
});
test('full rounds settle without holes or dead boards, including cascades and deterministic random', () => {
  let victories = 0;
  for (let level = 0; level < LEVELS.length; level++) {
    const game = new CandyGame(level,rng(level + 120));
    let rounds = 0;
    while (game.status === 'playing' && rounds++ < 40) {
      const moves = availableMoves(game.board); assert.ok(moves.length);
      game.play(...moves[rounds % moves.length]);
      assert.ok(game.board.every(c => c && Number.isInteger(c.color)));
      assert.equal(findMatches(game.board).length,0);
    }
    assert.notEqual(game.status,'playing'); if (game.status === 'won') victories++;
  }
  assert.ok(victories > 0);
  const game = new CandyGame(0,() => 0); assert.ok(availableMoves(game.board).length);
  game.play(...availableMoves(game.board)[0]); assert.equal(findMatches(game.board).length,0);
});
