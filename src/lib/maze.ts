// Maze Run: guide a little animal through a maze to its treat.
//
// Each level is built from a seed, so level 12 is always the same maze. The
// maze is "perfect" (exactly one route between any two squares), dug out
// with a random depth-first walk from the start. The treat goes on the square
// furthest from the start, so every maze has a long, twisty answer.

import { seededRandom } from './random';

export const MAZE_LEVEL_COUNT = 60;
export const MAZE_LEVELS_PER_WORLD = 10;

export const MAZE_WORLDS = [
  { name: 'Cheese Cellar', emoji: '🐭', color: '#FFF3BF' },
  { name: 'Carrot Patch', emoji: '🐰', color: '#FFE8CC' },
  { name: 'Bone Garden', emoji: '🐶', color: '#E7F5FF' },
  { name: 'Fishy Docks', emoji: '🐱', color: '#D0EBFF' },
  { name: 'Honey Woods', emoji: '🐻', color: '#FFF0D9' },
  { name: 'Bamboo Hills', emoji: '🐼', color: '#D3F9D8' },
];

/** The animal and its treat in each world. */
export const MAZE_HEROES = [
  { hero: '🐭', treat: '🧀' },
  { hero: '🐰', treat: '🥕' },
  { hero: '🐶', treat: '🦴' },
  { hero: '🐱', treat: '🐟' },
  { hero: '🐻', treat: '🍯' },
  { hero: '🐼', treat: '🎋' },
];

// Open sides of a square, as bits.
export const UP = 1;
export const RIGHT = 2;
export const DOWN = 4;
export const LEFT = 8;
export const DIRS = [UP, RIGHT, DOWN, LEFT];
const OPPOSITE: Record<number, number> = { [UP]: DOWN, [RIGHT]: LEFT, [DOWN]: UP, [LEFT]: RIGHT };

export type MazeLevel = {
  number: number;
  rows: number;
  cols: number;
  open: number[]; // open sides of each square (UP | RIGHT | DOWN | LEFT)
  start: number;
  goal: number;
  shortest: number; // steps on the best route
  starSteps: [number, number]; // most steps for 3 stars, for 2 stars
  hero: string;
  treat: string;
};

// Maze size by level: starts small, ends at 10 x 13.
const sizeFor = (n: number): { rows: number; cols: number } => {
  if (n <= 3) return { rows: 5, cols: 5 };
  if (n <= 8) return { rows: 6, cols: 6 };
  if (n <= 14) return { rows: 8, cols: 7 };
  if (n <= 22) return { rows: 9, cols: 8 };
  if (n <= 30) return { rows: 10, cols: 8 };
  if (n <= 40) return { rows: 11, cols: 9 };
  if (n <= 50) return { rows: 12, cols: 10 };
  return { rows: 13, cols: 10 };
};

/** The square next to `i` in direction `dir`, or -1 at the edge. */
export const step = (i: number, dir: number, rows: number, cols: number): number => {
  const r = Math.floor(i / cols);
  const c = i % cols;
  if (dir === UP) return r > 0 ? i - cols : -1;
  if (dir === DOWN) return r < rows - 1 ? i + cols : -1;
  if (dir === LEFT) return c > 0 ? i - 1 : -1;
  return c < cols - 1 ? i + 1 : -1;
};

/** The direction from square a to its neighbour b, or 0 if they don't touch. */
export const dirBetween = (a: number, b: number, cols: number): number => {
  if (b === a - cols) return UP;
  if (b === a + cols) return DOWN;
  if (b === a - 1 && a % cols > 0) return LEFT;
  if (b === a + 1 && b % cols > 0) return RIGHT;
  return 0;
};

/** True if you can walk straight from square a to its neighbour b. */
export const canWalk = (level: Pick<MazeLevel, 'open' | 'cols'>, a: number, b: number): boolean => {
  const d = dirBetween(a, b, level.cols);
  return d !== 0 && (level.open[a] & d) !== 0;
};

/** Steps from every square to `target` (walls respected). */
export const distancesTo = (level: Pick<MazeLevel, 'open' | 'rows' | 'cols'>, target: number): number[] => {
  const { rows, cols, open } = level;
  const dist = Array<number>(rows * cols).fill(-1);
  dist[target] = 0;
  const queue = [target];
  for (let k = 0; k < queue.length; k++) {
    const i = queue[k];
    for (const d of DIRS) {
      if (!(open[i] & d)) continue;
      const j = step(i, d, rows, cols);
      if (j >= 0 && dist[j] < 0) {
        dist[j] = dist[i] + 1;
        queue.push(j);
      }
    }
  }
  return dist;
};

const cache = new Map<number, MazeLevel>();

/** Level `n` (1-based): always the same maze. */
export const getMazeLevel = (n: number): MazeLevel => {
  const hit = cache.get(n);
  if (hit) return hit;

  const { rows, cols } = sizeFor(n);
  const size = rows * cols;
  const random = seededRandom(n * 7919 + 31);

  // Dig the maze: walk to a random unvisited neighbour, back up when stuck.
  const open = Array<number>(size).fill(0);
  const seen = Array<boolean>(size).fill(false);
  const start = 0;
  const stack = [start];
  seen[start] = true;
  while (stack.length) {
    const i = stack[stack.length - 1];
    const choices = DIRS.filter((d) => {
      const j = step(i, d, rows, cols);
      return j >= 0 && !seen[j];
    });
    if (choices.length === 0) {
      stack.pop();
      continue;
    }
    const d = choices[Math.floor(random() * choices.length)];
    const j = step(i, d, rows, cols);
    open[i] |= d;
    open[j] |= OPPOSITE[d];
    seen[j] = true;
    stack.push(j);
  }

  // The treat sits on the square furthest from the start.
  const fromStart = distancesTo({ open, rows, cols }, start);
  let goal = 0;
  fromStart.forEach((d, i) => {
    if (d > fromStart[goal]) goal = i;
  });
  const shortest = fromStart[goal];
  const world = Math.min(Math.floor((n - 1) / MAZE_LEVELS_PER_WORLD), MAZE_HEROES.length - 1);

  const level: MazeLevel = {
    number: n,
    rows,
    cols,
    open,
    start,
    goal,
    shortest,
    starSteps: [shortest + Math.max(2, Math.ceil(shortest * 0.15)), shortest + Math.ceil(shortest * 0.6) + 4],
    ...MAZE_HEROES[world],
  };
  cache.set(n, level);
  return level;
};

export const starsForSteps = (level: MazeLevel, steps: number, hints: number): number => {
  const stars = steps <= level.starSteps[0] ? 3 : steps <= level.starSteps[1] ? 2 : 1;
  return hints > 0 ? Math.min(stars, 2) : stars;
};
