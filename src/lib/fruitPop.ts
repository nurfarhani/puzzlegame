// Fruit Pop: a match-3 game. Swap two side-by-side fruits to line up 3 or
// more of the same kind; they pop, the fruits above fall down and new ones
// drop in from the top. Bigger matches make special fruits:
//   4 in a line      -> line blaster (clears its whole row or column)
//   L or T shape     -> bomb (clears the 3x3 square around it)
//   5 in a line      -> rainbow (swap it with a fruit to clear every one of that kind)
//
// Everything here is plain TypeScript with no React, so it can be tested
// (and played by a simple robot) outside the app.

import { seededRandom } from './random';

// ---------------------------------------------------------------------------
// Fruits, worlds and levels

export const FRUITS = [
  { emoji: '🍎', name: 'Apple', color: '#FA5252', bg: '#FFE3E3' },
  { emoji: '🍋', name: 'Lemon', color: '#FAB005', bg: '#FFF3BF' },
  { emoji: '🍇', name: 'Grapes', color: '#9C36B5', bg: '#F3D9FA' },
  { emoji: '🍊', name: 'Orange', color: '#FD7E14', bg: '#FFE8CC' },
  { emoji: '🍐', name: 'Pear', color: '#74B816', bg: '#E9FAC8' },
] as const;

export const LEVEL_COUNT = 60;
export const LEVELS_PER_WORLD = 10;

export const WORLDS = [
  { name: 'Berry Meadow', emoji: '🍓', color: '#FFC9DE' },
  { name: 'Lemon Beach', emoji: '🍋', color: '#FFEC99' },
  { name: 'Grape Hills', emoji: '🍇', color: '#E5DBFF' },
  { name: 'Orange Grove', emoji: '🍊', color: '#FFD8A8' },
  { name: 'Melon Island', emoji: '🍉', color: '#C3FAE8' },
  { name: 'Cherry Castle', emoji: '🍒', color: '#FFC9C9' },
];

export type Special = 'none' | 'row' | 'col' | 'bomb' | 'rainbow';
export type Piece = { id: number; kind: number; special: Special }; // a rainbow has kind -1
export type Cell = Piece | null;

export type Goal =
  | { type: 'score'; target: number }
  | { type: 'collect'; items: { kind: number; count: number }[] }
  | { type: 'jelly' }
  | { type: 'crates' };

export type FruitLevel = {
  number: number; // 1-60
  rows: number;
  cols: number;
  kinds: number; // how many different fruits drop
  moves: number;
  mask: boolean[]; // false = a hole in the board
  jelly: number[]; // jelly layers under each cell (0, 1 or 2)
  crates: number[]; // obstacle: a crate in the cell (0 = none, 1 or 2 hits to break)
  ice: boolean[]; // obstacle: the fruit in the cell starts frozen
  goal: Goal;
  stars: [number, number, number]; // points needed for 1, 2 and 3 stars
  seed: number;
};

// Board shapes ('#' = cell, '.' = hole). Pieces fall straight through holes.
const SHAPES: Record<string, string[]> = {
  corners: ['.######.', '########', '########', '########', '########', '########', '########', '.######.'],
  donut: ['########', '########', '########', '###..###', '###..###', '########', '########', '########'],
  plus: ['..####..', '..####..', '########', '########', '########', '########', '..####..', '..####..'],
  diamond: ['..####..', '.######.', '########', '########', '########', '########', '.######.', '..####..'],
  heart: ['.##..##.', '########', '########', '########', '########', '.######.', '..####..', '...##...'],
  bridge: ['###..###', '###..###', '########', '########', '########', '########', '###..###', '###..###'],
  pillars: ['########', '########', '##.##.##', '##.##.##', '########', '########', '########', '########'],
  hourglass: ['########', '.######.', '..####..', '..####..', '..####..', '..####..', '.######.', '########'],
};

// Where the jelly goes on jelly levels.
type JellyPattern = 'center' | 'bottom' | 'base' | 'cross' | 'ring' | 'checker' | 'all';
const jellyAt = (pattern: JellyPattern, r: number, c: number, rows: number, cols: number): boolean => {
  const mr = (rows - 1) / 2;
  const mc = (cols - 1) / 2;
  switch (pattern) {
    case 'center':
      return Math.abs(r - mr) < 2 && Math.abs(c - mc) < 2;
    case 'bottom':
      return r >= rows - 3;
    case 'base':
      return r >= rows - 2;
    case 'cross':
      return Math.abs(r - mr) < 1 || Math.abs(c - mc) < 1;
    case 'ring': {
      // A square ring one step in from the edge.
      const inside = r >= 1 && c >= 1 && r <= rows - 2 && c <= cols - 2;
      return inside && (r === 1 || c === 1 || r === rows - 2 || c === cols - 2);
    }
    case 'checker':
      return (r + c) % 2 === 0;
    case 'all':
      return true;
  }
};

// Obstacles. Crates sit in a cell instead of a fruit; a match next to a
// crate (or a blast over it) knocks it, and fruits fall past it. Frozen
// fruits can't be swapped and don't fall; matching or blasting one melts the
// ice and leaves the fruit free.
type ObstaclePattern = 'band' | 'middle' | 'pillars' | 'corners' | 'rows' | 'diagonal' | 'scatter';
const obstacleAt = (
  pattern: ObstaclePattern,
  r: number,
  c: number,
  rows: number,
  cols: number,
  random: () => number
): boolean => {
  switch (pattern) {
    case 'band':
      return r === Math.floor(rows / 2);
    case 'middle':
      return r >= rows / 2 - 1 && r < rows / 2 + 1 && c >= 2 && c < cols - 2;
    case 'pillars':
      return (c === 2 || c === cols - 3) && r >= 3 && r < rows - 1;
    case 'corners':
      return (r < 2 || r >= rows - 2) && (c < 2 || c >= cols - 2);
    case 'rows':
      return (r === 2 || r === rows - 3) && c >= 1 && c < cols - 1;
    case 'diagonal':
      return r >= 1 && r < rows - 1 && (c === r || c === cols - 1 - r);
    case 'scatter':
      return r >= 2 && random() < 0.16;
  }
};

type LevelPlan = {
  goal: 'score' | 'collect' | 'jelly' | 'crates';
  shape?: keyof typeof SHAPES;
  jelly?: JellyPattern;
  double?: boolean; // jelly with two layers
  crates?: ObstaclePattern;
  ice?: ObstaclePattern; // used from level 21 on
};

// A hand-made plan for the first levels, then a repeating mix.
const PLANS: LevelPlan[] = [
  { goal: 'score' }, // 1
  { goal: 'collect' },
  { goal: 'score' },
  { goal: 'jelly', jelly: 'center' },
  { goal: 'collect' },
  { goal: 'jelly', jelly: 'bottom' },
  { goal: 'score', shape: 'corners' },
  { goal: 'collect', shape: 'donut' },
  { goal: 'jelly', jelly: 'cross' },
  { goal: 'score', shape: 'plus' }, // 10
];
const MIX: LevelPlan[] = [
  { goal: 'crates', crates: 'band' }, // 11: crates arrive
  { goal: 'jelly', jelly: 'center', shape: 'diamond', ice: 'rows' },
  { goal: 'score', shape: 'heart', crates: 'scatter' },
  { goal: 'jelly', jelly: 'checker', ice: 'diagonal' },
  { goal: 'collect', shape: 'bridge', crates: 'pillars' },
  { goal: 'jelly', jelly: 'ring', crates: 'middle' },
  { goal: 'crates', crates: 'corners', ice: 'band' },
  { goal: 'collect', shape: 'hourglass', ice: 'middle' },
  { goal: 'jelly', jelly: 'base', double: true, crates: 'band' },
  { goal: 'crates', crates: 'rows', shape: 'corners', ice: 'scatter' },
];

// Moves and the points for 2 and 3 stars, per level. These come from a
// robot that played every level many times (see README): the move count
// lets it win about 9 times in 10, with spare moves for young players.
const TUNING: [number, number, number][] = [
  [14, 2900, 3800], [14, 3700, 4900], [11, 3000, 3900], [14, 4300, 7000], [13, 4100, 6000], // 1-5
  [19, 6800, 10800], [20, 2700, 3100], [22, 2200, 2700], [31, 4300, 5800], [28, 3200, 3500], // 6-10
  [12, 1600, 2200], [14, 1500, 2200], [24, 3100, 3300], [50, 6700, 9100], [25, 2600, 3200], // 11-15
  [24, 3100, 4500], [34, 4400, 6000], [22, 2400, 3000], [50, 7100, 10000], [11, 1600, 2400], // 16-20
  [19, 2700, 3500], [15, 1800, 2600], [30, 3900, 4300], [35, 6300, 7700], [29, 3000, 3700], // 21-25
  [22, 3100, 4600], [56, 8300, 10600], [32, 3100, 4000], [56, 7200, 10500], [27, 3200, 4000], // 26-30
  [17, 2300, 3600], [20, 2700, 3700], [32, 4400, 5000], [44, 6500, 8800], [32, 3500, 4500], // 31-35
  [20, 2900, 4200], [50, 7400, 9600], [35, 3500, 4200], [47, 6500, 8700], [26, 3200, 4400], // 36-40
  [21, 3000, 4200], [22, 3200, 3900], [35, 5100, 5700], [50, 7000, 8600], [31, 3800, 4300], // 41-45
  [22, 3300, 4300], [54, 7900, 9300], [41, 4100, 4900], [55, 7300, 10400], [29, 3100, 4200], // 46-50
  [17, 2300, 3300], [19, 2800, 3800], [39, 5700, 6300], [46, 6600, 8900], [40, 4800, 5600], // 51-55
  [21, 3000, 4500], [45, 7200, 8500], [46, 4700, 5600], [52, 7300, 10300], [22, 2900, 3500], // 56-60
];

const levelCache = new Map<number, FruitLevel>();

/** Level `n` (1-based): always the same board, goal and move count. */
export const getFruitLevel = (n: number): FruitLevel => {
  const hit = levelCache.get(n);
  if (hit) return hit;

  const plan = n <= PLANS.length ? PLANS[n - 1] : MIX[(n - PLANS.length - 1) % MIX.length];
  const round = n <= PLANS.length ? 0 : Math.floor((n - PLANS.length - 1) / MIX.length) + 1; // 1-5
  const small = n <= 3;
  const rows = small ? 7 : 8;
  const cols = small ? 7 : 8;
  const kinds = n <= 6 ? 4 : 5;
  const random = seededRandom(n * 7919 + 4243);

  const shape = plan.shape && !small ? SHAPES[plan.shape] : null;
  const mask = Array.from({ length: rows * cols }, (_, i) =>
    shape ? shape[Math.floor(i / cols)][i % cols] === '#' : true
  );
  // Score and collect goals are sized for about this many good moves,
  // growing slowly from 8 to about 29 over the 60 levels.
  const aim = 8 + n * 0.35;

  const jelly = mask.map((ok, i) => {
    if (!ok || plan.goal !== 'jelly' || !plan.jelly) return 0;
    const on = jellyAt(plan.jelly, Math.floor(i / cols), i % cols, rows, cols);
    return on ? (plan.double || (round >= 3 && plan.jelly === 'center') ? 2 : 1) : 0;
  });

  // Obstacles: crates from level 11, frozen fruits from level 21. Neither
  // goes on jelly, so every jelly square can be reached. Crates get tougher
  // (two hits) from level 21 on crate levels.
  const obstacle = (pattern: ObstaclePattern | undefined) => {
    const pick = seededRandom(n * 131 + 17);
    return mask.map(
      (ok, i) =>
        !!pattern && ok && jelly[i] === 0 && obstacleAt(pattern, Math.floor(i / cols), i % cols, rows, cols, pick)
    );
  };
  const crateCells = obstacle(plan.crates);
  const crates = crateCells.map((on) => (on ? (plan.goal === 'crates' && round >= 2 ? 2 : 1) : 0));
  const ice = obstacle(round >= 2 ? plan.ice : undefined).map((on, i) => on && !crateCells[i]);

  let goal: Goal;
  if (plan.goal === 'score') {
    goal = { type: 'score', target: Math.round((aim * (kinds === 4 ? 250 : 175)) / 100) * 100 };
  } else if (plan.goal === 'collect') {
    const total = Math.round(aim * (kinds === 4 ? 3.2 : 2.6));
    const two = n >= 8;
    const first = Math.floor(random() * kinds);
    const second = (first + 1 + Math.floor(random() * (kinds - 1))) % kinds;
    const items = two
      ? [
          { kind: first, count: Math.ceil(total / 2) },
          { kind: second, count: Math.floor(total / 2) },
        ]
      : [{ kind: first, count: total }];
    goal = { type: 'collect', items };
  } else if (plan.goal === 'crates') {
    goal = { type: 'crates' };
  } else {
    goal = { type: 'jelly' };
  }

  // Stars: the first is the goal itself; the others need extra points.
  const tuned = TUNING[n - 1];
  const moves = tuned ? tuned[0] : Math.ceil(aim * 1.4) + 2;
  const stars: [number, number, number] = [
    goal.type === 'score' ? goal.target : 0,
    tuned ? tuned[1] : Math.round((moves * 120) / 100) * 100,
    tuned ? tuned[2] : Math.round((moves * 170) / 100) * 100,
  ];

  const level: FruitLevel = {
    number: n,
    rows,
    cols,
    kinds,
    moves,
    mask,
    jelly,
    crates,
    ice,
    goal,
    stars,
    seed: n * 104729 + 7,
  };
  levelCache.set(n, level);
  return level;
};

/** Points for each move left over when the goal is reached. */
export const BONUS_PER_MOVE = 60;

export const starsForScore = (level: FruitLevel, score: number): number =>
  score >= level.stars[2] ? 3 : score >= level.stars[1] ? 2 : 1;

// ---------------------------------------------------------------------------
// Playing a level

export type Blast = { type: 'row' | 'col' | 'bomb' | 'rainbow'; index: number };

/** What happened during a move, in order, so the screen can animate it. */
export type Step =
  | { type: 'swap'; board: Cell[] }
  | {
      type: 'clear';
      board: Cell[];
      jelly: number[];
      popped: { piece: Piece; index: number }[];
      blasts: Blast[];
      score: number;
      combo: number; // 1 for the first pop of a move, 2 for the next cascade, ...
      collected: number[];
      crates: number[];
      ice: boolean[];
      hits: number[]; // crates knocked this step
      melted: number[]; // frozen fruits set free this step
    }
  | { type: 'fall'; board: Cell[]; spawn: Record<number, number> } // new piece id -> row it drops from (negative)
  | { type: 'shuffle'; board: Cell[] };

export type Status = 'playing' | 'won' | 'lost';

type Group = { cells: number[]; kind: number; special: Special; spot: number };

export class FruitGame {
  readonly level: FruitLevel;
  board: Cell[];
  jelly: number[];
  crates: number[];
  ice: boolean[];
  score = 0;
  movesLeft: number;
  movesUsed = 0;
  collected: number[];
  private random: () => number;
  private nextId = 1;

  constructor(level: FruitLevel, random?: () => number) {
    this.level = level;
    this.random = random ?? seededRandom(level.seed);
    this.jelly = [...level.jelly];
    this.crates = [...level.crates];
    this.ice = [...level.ice];
    this.movesLeft = level.moves;
    this.collected = FRUITS.map(() => 0);
    this.board = this.fillBoard();
  }

  /** A copy for trying moves out (uses its own random numbers for new fruits). */
  clone(random: () => number): FruitGame {
    const copy = Object.create(FruitGame.prototype) as FruitGame;
    Object.assign(copy, this, {
      board: [...this.board],
      jelly: [...this.jelly],
      crates: [...this.crates],
      ice: [...this.ice],
      collected: [...this.collected],
      random,
    });
    return copy;
  }

  // --- small helpers ---

  private get rows() {
    return this.level.rows;
  }
  private get cols() {
    return this.level.cols;
  }
  private open(i: number) {
    return this.level.mask[i];
  }
  private newPiece(kind: number, special: Special = 'none'): Piece {
    return { id: this.nextId++, kind, special };
  }
  private randomKind() {
    return Math.floor(this.random() * this.level.kinds);
  }
  /** The fruit kind at a cell for matching, or -1 (hole, empty or rainbow). */
  private kindAt(board: Cell[], i: number): number {
    const p = board[i];
    return p && p.special !== 'rainbow' ? p.kind : -1;
  }

  /** Can a fruit drop into (or out of) this cell? */
  private falls(i: number) {
    return this.open(i) && this.crates[i] === 0 && !this.ice[i];
  }
  /** The cells above, below, left and right of i. */
  private sides(i: number): number[] {
    const { cols } = this;
    const c = i % cols;
    return [i - cols, i + cols, c > 0 ? i - 1 : -1, c < cols - 1 ? i + 1 : -1].filter(
      (j) => j >= 0 && j < this.board.length
    );
  }

  adjacent(a: number, b: number): boolean {
    const ra = Math.floor(a / this.cols);
    const rb = Math.floor(b / this.cols);
    return (ra === rb && Math.abs(a - b) === 1) || Math.abs(a - b) === this.cols;
  }

  // --- the board ---

  /** A fresh board with no ready-made matches and at least one move. */
  private fillBoard(): Cell[] {
    const { rows, cols } = this;
    for (let tries = 0; ; tries++) {
      const board: Cell[] = Array(rows * cols).fill(null);
      for (let i = 0; i < board.length; i++) {
        if (!this.open(i) || this.crates[i] > 0) continue;
        const r = Math.floor(i / cols);
        const c = i % cols;
        const banned = new Set<number>();
        if (c >= 2 && this.kindAt(board, i - 1) >= 0 && this.kindAt(board, i - 1) === this.kindAt(board, i - 2))
          banned.add(this.kindAt(board, i - 1));
        if (
          r >= 2 &&
          this.kindAt(board, i - cols) >= 0 &&
          this.kindAt(board, i - cols) === this.kindAt(board, i - 2 * cols)
        )
          banned.add(this.kindAt(board, i - cols));
        let kind = this.randomKind();
        while (banned.has(kind)) kind = (kind + 1) % this.level.kinds;
        board[i] = this.newPiece(kind);
      }
      if (this.findMoves(board).length > 0 || tries > 30) return board;
    }
  }

  /** Every line of 3+ matching fruits, grouped into connected matches. */
  private findGroups(board: Cell[], preferred: number[]): Group[] {
    const { rows, cols } = this;
    type Run = { cells: number[]; dir: 'h' | 'v' };
    const runs: Run[] = [];
    const scan = (count: number, length: number, at: (line: number, k: number) => number, dir: 'h' | 'v') => {
      for (let line = 0; line < count; line++) {
        let k = 0;
        while (k < length) {
          const kind = this.kindAt(board, at(line, k));
          let end = k + 1;
          if (kind >= 0) {
            while (end < length && this.kindAt(board, at(line, end)) === kind) end++;
            if (end - k >= 3) {
              const cells: number[] = [];
              for (let x = k; x < end; x++) cells.push(at(line, x));
              runs.push({ cells, dir });
            }
          }
          k = end;
        }
      }
    };
    scan(rows, cols, (r, c) => r * cols + c, 'h');
    scan(cols, rows, (c, r) => r * cols + c, 'v');
    if (runs.length === 0) return [];

    // Join runs that share a cell (L and T shapes).
    const parent = runs.map((_, i) => i);
    const find = (x: number): number => (parent[x] === x ? x : (parent[x] = find(parent[x])));
    const owner = new Map<number, number>();
    runs.forEach((run, i) => {
      for (const cell of run.cells) {
        const other = owner.get(cell);
        if (other !== undefined) parent[find(i)] = find(other);
        else owner.set(cell, i);
      }
    });
    const byRoot = new Map<number, Run[]>();
    runs.forEach((run, i) => {
      const root = find(i);
      byRoot.set(root, [...(byRoot.get(root) ?? []), run]);
    });

    const groups: Group[] = [];
    for (const members of byRoot.values()) {
      const cells = [...new Set(members.flatMap((m) => m.cells))];
      const longest = members.reduce((a, b) => (b.cells.length > a.cells.length ? b : a));
      const hasH = members.some((m) => m.dir === 'h');
      const hasV = members.some((m) => m.dir === 'v');
      const special: Special =
        longest.cells.length >= 5
          ? 'rainbow'
          : hasH && hasV
            ? 'bomb'
            : longest.cells.length === 4
              ? longest.dir === 'h'
                ? 'row'
                : 'col'
              : 'none';
      const free = (p: number) => !this.ice[p];
      let spot = preferred.find((p) => cells.includes(p) && free(p)) ?? -1;
      if (spot < 0 && special === 'bomb') {
        // Where the two lines cross.
        const counts = new Map<number, number>();
        members.forEach((m) => m.cells.forEach((c) => counts.set(c, (counts.get(c) ?? 0) + 1)));
        spot = [...counts.entries()].find(([, n]) => n > 1)?.[0] ?? cells[0];
      }
      if (spot < 0) spot = longest.cells[Math.floor((longest.cells.length - 1) / 2)];
      if (!free(spot)) spot = cells.find(free) ?? -1; // -1: all frozen, no special
      groups.push({ cells, kind: this.kindAt(board, cells[0]), special, spot });
    }
    return groups;
  }

  /** Is there a line of 3 through cell i? */
  private lineAt(board: Cell[], i: number): boolean {
    const kind = this.kindAt(board, i);
    if (kind < 0) return false;
    const { cols, rows } = this;
    const r = Math.floor(i / cols);
    const c = i % cols;
    let h = 1;
    for (let x = c - 1; x >= 0 && this.kindAt(board, r * cols + x) === kind; x--) h++;
    for (let x = c + 1; x < cols && this.kindAt(board, r * cols + x) === kind; x++) h++;
    if (h >= 3) return true;
    let v = 1;
    for (let y = r - 1; y >= 0 && this.kindAt(board, y * cols + c) === kind; y--) v++;
    for (let y = r + 1; y < rows && this.kindAt(board, y * cols + c) === kind; y++) v++;
    return v >= 3;
  }

  /** Every swap that does something, as [a, b] cell pairs. */
  findMoves(board: Cell[] = this.board): [number, number][] {
    const moves: [number, number][] = [];
    const { cols } = this;
    for (let a = 0; a < board.length; a++) {
      const pa = board[a];
      if (!pa || this.ice[a]) continue;
      const right = a % cols < cols - 1 ? a + 1 : -1;
      const down = a + cols < board.length ? a + cols : -1;
      for (const b of [right, down]) {
        const pb = b >= 0 && !this.ice[b] ? board[b] : null;
        if (!pb) continue;
        if (pa.special === 'rainbow' || pb.special === 'rainbow') {
          moves.push([a, b]);
          continue;
        }
        if (pa.special !== 'none' && pb.special !== 'none') {
          moves.push([a, b]);
          continue;
        }
        board[a] = pb;
        board[b] = pa;
        if (this.lineAt(board, a) || this.lineAt(board, b)) moves.push([a, b]);
        board[a] = pa;
        board[b] = pb;
      }
    }
    return moves;
  }

  /** The cells a special fruit clears when it goes off at cell i. */
  private blastCells(board: Cell[], piece: Piece, i: number): number[] {
    const { rows, cols } = this;
    const r = Math.floor(i / cols);
    const c = i % cols;
    const out: number[] = [];
    if (piece.special === 'row') for (let x = 0; x < cols; x++) out.push(r * cols + x);
    else if (piece.special === 'col') for (let y = 0; y < rows; y++) out.push(y * cols + c);
    else if (piece.special === 'bomb') {
      for (let y = r - 1; y <= r + 1; y++)
        for (let x = c - 1; x <= c + 1; x++) if (y >= 0 && y < rows && x >= 0 && x < cols) out.push(y * cols + x);
    } else if (piece.special === 'rainbow') {
      // Set off by another blast: takes the most common fruit with it.
      const counts = FRUITS.map(() => 0);
      board.forEach((p) => p && p.kind >= 0 && counts[p.kind]++);
      const kind = counts.indexOf(Math.max(...counts));
      board.forEach((p, j) => p && p.kind === kind && out.push(j));
    }
    return out.filter((j) => this.open(j));
  }

  status(): Status {
    if (this.goalDone()) return 'won';
    return this.movesLeft <= 0 ? 'lost' : 'playing';
  }

  goalDone(): boolean {
    const { goal } = this.level;
    if (goal.type === 'score') return this.score >= goal.target;
    if (goal.type === 'collect') return goal.items.every((it) => this.collected[it.kind] >= it.count);
    if (goal.type === 'crates') return this.cratesLeft() === 0;
    return this.jelly.every((j) => j === 0);
  }

  jellyLeft(): number {
    return this.jelly.reduce((s, j) => s + j, 0);
  }

  /** Crate hits still needed (a two-hit crate counts twice). */
  cratesLeft(): number {
    return this.crates.reduce((s, c) => s + c, 0);
  }

  addMoves(n: number) {
    this.movesLeft += n;
  }

  /**
   * Swap the fruits at cells a and b. Returns the steps to animate, or null
   * if the swap isn't allowed at all (not next to each other, game over).
   * A swap that makes no match comes back with valid: false (swap and swap back).
   */
  trySwap(a: number, b: number): { valid: boolean; steps: Step[] } | null {
    if (this.status() !== 'playing' || !this.adjacent(a, b)) return null;
    const pa = this.board[a];
    const pb = this.board[b];
    if (!pa || !pb || this.ice[a] || this.ice[b]) return null;

    const steps: Step[] = [];
    this.board[a] = pb;
    this.board[b] = pa;
    steps.push({ type: 'swap', board: [...this.board] });

    let start: Set<number> | null = null;
    if (pa.special === 'rainbow' || pb.special === 'rainbow') {
      start = this.rainbowSwap(a, b, pa, pb);
    } else if (pa.special !== 'none' && pb.special !== 'none') {
      start = new Set([a, b]); // two specials: both go off
    } else if (this.findGroups(this.board, [a, b]).length === 0) {
      this.board[a] = pa;
      this.board[b] = pb;
      steps.push({ type: 'swap', board: [...this.board] });
      return { valid: false, steps };
    }

    this.movesLeft--;
    this.movesUsed++;
    this.resolve([a, b], start, steps);
    return { valid: true, steps };
  }

  /** A rainbow swapped with something: what gets cleared to start with. */
  private rainbowSwap(a: number, b: number, pa: Piece, pb: Piece): Set<number> {
    // After the swap the rainbow sits at one cell and the other piece at the other.
    const rainbowCell = pa.special === 'rainbow' ? b : a;
    const other = pa.special === 'rainbow' ? pb : pa;
    const otherCell = rainbowCell === a ? b : a;
    const clear = new Set<number>([rainbowCell, otherCell]);
    if (other.special === 'rainbow') {
      this.board.forEach((p, i) => p && clear.add(i)); // two rainbows: everything
      return clear;
    }
    this.board.forEach((p, i) => {
      if (!p || p.kind !== other.kind || p.special === 'rainbow') return;
      if (other.special !== 'none') {
        // Every fruit of that kind turns into the same special and goes off.
        const special: Special =
          other.special === 'bomb' ? 'bomb' : this.random() < 0.5 ? 'row' : 'col';
        this.board[i] = { ...p, special };
      }
      clear.add(i);
    });
    return clear;
  }

  /** Pop matches, drop fruits and repeat until the board settles. */
  private resolve(preferred: number[], start: Set<number> | null, steps: Step[]) {
    const { cols } = this;
    let combo = 1;
    let first = start;
    let prefer = preferred;
    for (let guard = 0; guard < 60; guard++) {
      const groups = first ? [] : this.findGroups(this.board, prefer);
      if (!first && groups.length === 0) break;

      const clear = new Set<number>(first ?? []);
      const created = new Map<number, Piece>();
      for (const g of groups) {
        g.cells.forEach((c) => clear.add(c));
        if (g.special !== 'none' && g.spot >= 0) {
          created.set(g.spot, this.newPiece(g.special === 'rainbow' ? -1 : g.kind, g.special));
        }
      }
      first = null;
      prefer = [];

      // Special fruits caught in the pop go off too (and can set off others).
      const blasts: Blast[] = [];
      const hits = new Set<number>(); // crates knocked
      const fired = new Set<number>();
      const queue = [...clear];
      while (queue.length) {
        const i = queue.shift() as number;
        const p = this.board[i];
        if (!p || p.special === 'none' || fired.has(p.id)) continue;
        fired.add(p.id);
        blasts.push({ type: p.special, index: i });
        for (const j of this.blastCells(this.board, p, i)) {
          if (this.crates[j] > 0) hits.add(j);
          if (!clear.has(j) && this.board[j]) {
            clear.add(j);
            queue.push(j);
          }
        }
      }

      const popped: { piece: Piece; index: number }[] = [];
      const melted: number[] = [];
      for (const i of clear) {
        const p = this.board[i];
        if (!p) continue;
        // A match next to a crate knocks it.
        for (const j of this.sides(i)) if (this.crates[j] > 0) hits.add(j);
        if (this.ice[i]) {
          // Frozen: the ice melts and the fruit stays.
          this.ice[i] = false;
          melted.push(i);
          continue;
        }
        popped.push({ piece: p, index: i });
        if (p.kind >= 0) this.collected[p.kind]++;
        if (this.jelly[i] > 0) this.jelly[i]--;
        this.board[i] = null;
      }
      for (const [spot, piece] of created) this.board[spot] = piece;
      for (const j of hits) this.crates[j]--;
      this.score += popped.length * 10 * combo + created.size * 20 + (hits.size + melted.length) * 20;
      steps.push({
        type: 'clear',
        board: [...this.board],
        jelly: [...this.jelly],
        popped,
        blasts,
        score: this.score,
        combo,
        collected: [...this.collected],
        crates: [...this.crates],
        ice: [...this.ice],
        hits: [...hits],
        melted,
      });

      // Gravity: each column's fruits drop down; new ones fill in from the top.
      const spawn: Record<number, number> = {};
      for (let c = 0; c < cols; c++) {
        const cells: number[] = [];
        // Fruits fall past holes, crates and frozen fruits.
        for (let i = c; i < this.board.length; i += cols) if (this.falls(i)) cells.push(i);
        const kept = cells.map((i) => this.board[i]).filter((p): p is Piece => p !== null);
        const fresh = cells.length - kept.length;
        if (fresh === 0) continue;
        const column: Piece[] = [];
        for (let k = 0; k < fresh; k++) {
          const piece = this.newPiece(this.randomKind());
          spawn[piece.id] = k - fresh; // rows above the top of the board
          column.push(piece);
        }
        column.push(...kept);
        cells.forEach((i, k) => (this.board[i] = column[k]));
      }
      steps.push({ type: 'fall', board: [...this.board], spawn });
      combo++;
    }

    if (this.findMoves().length === 0) {
      this.shuffle();
      steps.push({ type: 'shuffle', board: [...this.board] });
    }
  }

  /** No moves left: mix up the plain fruits until there is one. */
  private shuffle() {
    const spots = this.board
      .map((p, i) => (p && p.special === 'none' && !this.ice[i] ? i : -1))
      .filter((i) => i >= 0);
    for (let tries = 0; tries < 200; tries++) {
      const pieces = spots.map((i) => this.board[i] as Piece);
      for (let k = pieces.length - 1; k > 0; k--) {
        const j = Math.floor(this.random() * (k + 1));
        [pieces[k], pieces[j]] = [pieces[j], pieces[k]];
      }
      spots.forEach((i, k) => (this.board[i] = pieces[k]));
      if (this.findGroups(this.board, []).length === 0 && this.findMoves().length > 0) return;
    }
    // Very unlucky: start the plain fruits over.
    for (const i of spots) this.board[i] = this.newPiece(this.randomKind());
    if (this.findMoves().length === 0 || this.findGroups(this.board, []).length > 0) {
      const fresh = this.fillBoard();
      this.board = this.board.map((p, i) => (p && p.special !== 'none' ? p : fresh[i]));
    }
  }
}
