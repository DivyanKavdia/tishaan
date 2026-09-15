export const SIZE = 8;
export const COLORS = ['Rose', 'Orange', 'Lemon', 'Mint', 'Blueberry', 'Grape'];
export const LEVELS = Array.from({ length: 24 }, (_, i) => ({
  name: ['Sugar Meadow', 'Jelly Garden', 'Caramel Clouds', 'Sprinkle Summit'][Math.floor(i / 6)],
  moves: i < 3 ? 25 : 27 + Math.floor(i / 6),
  target: 1000 + i * 160,
  colors: i < 6 ? 5 : 6,
  jelly: i < 2 ? 0 : Math.min(28, 8 + Math.floor(i / 2) * 2),
}));
const clone = value => JSON.parse(JSON.stringify(value));
export const adjacent = (a, b) => Number.isInteger(a) && Number.isInteger(b) && a >= 0 && b >= 0 && a < 64 && b < 64 && Math.abs(Math.floor(a / SIZE) - Math.floor(b / SIZE)) + Math.abs(a % SIZE - b % SIZE) === 1;
const swap = (board, a, b) => { [board[a], board[b]] = [board[b], board[a]]; };

export function findMatches(board) {
  const runs = [];
  for (const direction of ['row', 'column']) {
    for (let line = 0; line < SIZE; line++) {
      let cells = [];
      const finish = () => { if (cells.length >= 3) runs.push({ cells, direction }); cells = []; };
      for (let n = 0; n <= SIZE; n++) {
        const index = direction === 'row' ? line * SIZE + n : n * SIZE + line;
        const candy = n < SIZE ? board[index] : null;
        if (!candy || candy.special === 'rainbow' || (cells.length && board[cells[0]].color !== candy.color)) finish();
        if (candy && candy.special !== 'rainbow') cells.push(index);
      }
    }
  }
  return runs;
}

export function validSwap(board, a, b) {
  if (!adjacent(a, b) || !board[a] || !board[b]) return false;
  if (board[a].special === 'rainbow' || board[b].special === 'rainbow' || (board[a].special && board[b].special)) return true;
  swap(board, a, b);
  const valid = findMatches(board).some(run => run.cells.includes(a) || run.cells.includes(b));
  swap(board, a, b);
  return valid;
}

export function availableMoves(board) {
  const moves = [];
  for (let i = 0; i < board.length; i++) {
    for (const j of [i + 1, i + SIZE]) if (validSwap(board, i, j)) moves.push([i, j]);
  }
  return moves;
}

export class CandyGame {
  constructor(level = 0, random = Math.random) {
    this.random = random;
    this.level = Math.max(0, Math.min(LEVELS.length - 1, Math.floor(level) || 0));
    this.rules = LEVELS[this.level];
    this.score = 0;
    this.moves = this.rules.moves;
    this.boosters = { hammer: 2, shuffle: 2 };
    this.status = 'playing';
    this.jelly = Array(64).fill(0);
    const positions = Array.from({ length: 64 }, (_, i) => i);
    this.mix(positions);
    positions.slice(0, this.rules.jelly).forEach(i => { this.jelly[i] = 1; });
    this.board = this.freshBoard();
  }

  candy() { return { color: Math.min(this.rules.colors - 1, Math.floor(this.random() * this.rules.colors)), special: null }; }
  mix(values) {
    for (let i = values.length - 1; i > 0; i--) {
      const j = Math.min(i, Math.floor(this.random() * (i + 1)));
      [values[i], values[j]] = [values[j], values[i]];
    }
    return values;
  }
  freshBoard() {
    for (let attempt = 0; attempt < 100; attempt++) {
      const board = [];
      for (let i = 0; i < 64; i++) {
        const allowed = Array.from({ length: this.rules.colors }, (_, c) => c).filter(c =>
          !(i % SIZE >= 2 && board[i - 1].color === c && board[i - 2].color === c) &&
          !(i >= 16 && board[i - SIZE].color === c && board[i - SIZE * 2].color === c));
        board.push({ color: allowed[Math.min(allowed.length - 1, Math.floor(this.random() * allowed.length))], special: null });
      }
      if (availableMoves(board).length) return board;
    }
    // Deterministic fallback also handles a degenerate random source.
    const board = Array.from({ length: 64 }, (_, i) => ({ color: (i + Math.floor(i / 8)) % this.rules.colors, special: null }));
    [board[0].color, board[1].color, board[2].color, board[9].color] = [0, 1, 0, 0];
    return board;
  }
  snapshot() {
    return clone({ version: 1, level: this.level, score: this.score, moves: this.moves, boosters: this.boosters, status: this.status, board: this.board, jelly: this.jelly });
  }
  static restore(data, random = Math.random) {
    if (!data || data.version !== 1 || !Number.isInteger(data.level) || !LEVELS[data.level] || data.status !== 'playing') return null;
    const rules = LEVELS[data.level];
    if (!Number.isInteger(data.score) || data.score < 0 || data.score > 1e8 || !Number.isInteger(data.moves) || data.moves <= 0 || data.moves > rules.moves) return null;
    if (!Array.isArray(data.board) || data.board.length !== 64 || !data.board.every(c => c && Number.isInteger(c.color) && c.color >= 0 && c.color < rules.colors && [null, 'row', 'column', 'wrapped', 'rainbow'].includes(c.special))) return null;
    if (!Array.isArray(data.jelly) || data.jelly.length !== 64 || !data.jelly.every(j => j === 0 || j === 1)) return null;
    if (!data.boosters || !['hammer', 'shuffle'].every(k => Number.isInteger(data.boosters[k]) && data.boosters[k] >= 0 && data.boosters[k] <= 2)) return null;
    if (findMatches(data.board).length || !availableMoves(data.board).length) return null;
    const game = new CandyGame(data.level, random);
    Object.assign(game, clone(data));
    return game;
  }
  get jellyLeft() { return this.jelly.reduce((a, b) => a + b, 0); }
  get stars() { return this.score >= this.rules.target * 1.8 ? 3 : this.score >= this.rules.target * 1.35 ? 2 : this.score >= this.rules.target ? 1 : 0; }

  creations(runs, preferred) {
    const groups = [];
    for (const run of runs) {
      const touching = groups.filter(g => g.runs.some(r => r.cells.some(i => run.cells.includes(i))));
      const group = { runs: [run, ...touching.flatMap(g => g.runs)] };
      touching.forEach(g => groups.splice(groups.indexOf(g), 1));
      groups.push(group);
    }
    return groups.flatMap(({ runs: group }) => {
      const long = group.find(r => r.cells.length >= 5);
      const intersection = group.flatMap(r => r.cells).find(i => group.filter(r => r.cells.includes(i)).length > 1);
      const four = group.find(r => r.cells.length === 4);
      const special = long ? 'rainbow' : intersection !== undefined ? 'wrapped' : four ? four.direction : null;
      if (!special) return [];
      const cells = long?.cells || (intersection !== undefined ? [intersection] : four.cells);
      const index = preferred.find(i => cells.includes(i)) ?? cells[Math.floor(cells.length / 2)];
      return [{ index, candy: { color: this.board[index].color, special } }];
    });
  }

  clear(indices, creations, chain, frames, label) {
    const cleared = new Set(indices);
    const queue = [...cleared];
    for (let n = 0; n < queue.length; n++) {
      const i = queue[n], candy = this.board[i];
      if (!candy?.special) continue;
      const add = j => { if (!cleared.has(j)) { cleared.add(j); queue.push(j); } };
      if (candy.special === 'rainbow') {
        const counts = Array(this.rules.colors).fill(0);
        this.board.forEach(c => { if (c) counts[c.color]++; });
        const color = counts.indexOf(Math.max(...counts));
        this.board.forEach((c, j) => { if (c?.color === color) add(j); });
      } else {
        for (let j = 0; j < 64; j++) {
          const row = Math.floor(i / SIZE), col = i % SIZE, r = Math.floor(j / SIZE), c = j % SIZE;
          if ((candy.special === 'row' && r === row) || (candy.special === 'column' && c === col) || (candy.special === 'wrapped' && Math.abs(r - row) <= 1 && Math.abs(c - col) <= 1)) add(j);
        }
      }
    }
    const earned = cleared.size * 40 * Math.min(chain, 4) + creations.length * 100;
    cleared.forEach(i => { this.jelly[i] = 0; });
    this.score += earned;
    frames.push({ type: 'clear', board: clone(this.board), jelly: [...this.jelly], cells: [...cleared], score: this.score, earned, chain, label, creations });
    cleared.forEach(i => { this.board[i] = null; });
    creations.forEach(({ index, candy }) => { this.board[index] = candy; });
    const falls = [];
    for (let col = 0; col < SIZE; col++) {
      let dest = SIZE - 1;
      for (let row = SIZE - 1; row >= 0; row--) {
        const from = row * SIZE + col;
        if (this.board[from]) {
          const to = dest * SIZE + col;
          this.board[to] = this.board[from];
          if (to !== from) { this.board[from] = null; falls.push({ to, distance: dest - row }); }
          dest--;
        }
      }
      const count = dest + 1;
      for (; dest >= 0; dest--) { const to = dest * SIZE + col; this.board[to] = this.candy(); falls.push({ to, distance: count }); }
    }
    frames.push({ type: 'fall', board: clone(this.board), jelly: [...this.jelly], falls, score: this.score });
  }

  settle(frames, preferred = []) {
    let runs = findMatches(this.board), chain = frames.some(f => f.type === 'clear') ? 2 : 1;
    while (runs.length && chain <= 60) {
      this.clear(runs.flatMap(r => r.cells), this.creations(runs, preferred), chain, frames);
      preferred = [];
      runs = findMatches(this.board);
      chain++;
    }
    if (runs.length) { this.board = this.freshBoard(); frames.push({ type: 'shuffle', board: clone(this.board), jelly: [...this.jelly] }); }
    if (this.score >= this.rules.target && !this.jellyLeft) this.status = 'won';
    else if (this.moves <= 0) this.status = 'lost';
    else if (!availableMoves(this.board).length) this.reshuffle(frames);
    return { accepted: true, frames, status: this.status };
  }

  play(a, b) {
    if (this.status !== 'playing' || !validSwap(this.board, a, b)) return { accepted: false, frames: [] };
    swap(this.board, a, b);
    this.moves--;
    const frames = [{ type: 'swap', board: clone(this.board), jelly: [...this.jelly], cells: [a, b] }];
    const first = this.board[a], second = this.board[b];
    if (first.special === 'rainbow' || second.special === 'rainbow') {
      const both = first.special === 'rainbow' && second.special === 'rainbow';
      const other = first.special === 'rainbow' ? second : first;
      const selected = this.board.flatMap((c, i) => both || c.color === other.color ? [i] : []);
      if (!both && other.special) this.board.forEach(c => { if (c.color === other.color && c.special !== 'rainbow') c.special = other.special; });
      // The bomb's chosen color is handled explicitly; it must not trigger a second color.
      [first, second].forEach(c => { if (c.special === 'rainbow') c.special = null; });
      this.clear([...selected, a, b], [], 1, frames, both ? 'Rainbow party!' : 'Color pop!');
    } else if (first.special && second.special) {
      const selected = [a, b];
      const wrapped = [first, second].filter(c => c.special === 'wrapped').length;
      const r = Math.floor(b / SIZE), c = b % SIZE;
      for (let i = 0; i < 64; i++) {
        const dr = Math.abs(Math.floor(i / SIZE) - r), dc = Math.abs(i % SIZE - c);
        if (wrapped === 2 ? dr <= 2 && dc <= 2 : wrapped === 1 ? dr <= 1 || dc <= 1 : dr === 0 || dc === 0) selected.push(i);
      }
      this.clear(selected, [], 1, frames, 'Super sweet!');
    }
    return this.settle(frames, [b, a]);
  }

  reshuffle(frames = []) {
    const original = clone(this.board);
    let success = false;
    for (let attempt = 0; attempt < 200; attempt++) {
      this.board = this.mix(clone(original));
      if (!findMatches(this.board).length && availableMoves(this.board).length) { success = true; break; }
    }
    if (!success) this.board = this.freshBoard();
    frames.push({ type: 'shuffle', board: clone(this.board), jelly: [...this.jelly] });
    return frames;
  }
  boost(kind, index) {
    if (this.status !== 'playing' || !this.boosters[kind] || !['hammer', 'shuffle'].includes(kind)) return { accepted: false, frames: [] };
    if (kind === 'hammer' && (!Number.isInteger(index) || index < 0 || index >= 64)) return { accepted: false, frames: [] };
    this.boosters[kind]--;
    const frames = [];
    if (kind === 'shuffle') this.reshuffle(frames);
    else this.clear([index], [], 1, frames, 'Pop!');
    return this.settle(frames);
  }
}
