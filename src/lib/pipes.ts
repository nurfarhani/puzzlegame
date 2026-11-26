// Flower Pipes: every tile holds a piece of pipe. Tap a tile to turn it a
// quarter turn. Connect every pipe to the water tap so all the flowers get
// watered, with no pipe left pointing at nothing.
//
// Each level is built from a seed: a random tree of pipes that reaches every
// tile (so there is always an answer), then every tile is turned at random.

import { seededRandom } from './random';

export const PIPE_LEVEL_COUNT = 60;
export const PIPE_LEVELS_PER_WORLD = 10;

export const PIPE_WORLDS = [
  { name: 'Seed Garden', emoji: '🌱', color: '#D3F9D8' },
  { name: 'Sunny Fields', emoji: '🌻', color: '#FFF3BF' },
  { name: 'Tulip Town', emoji: '🌷', color: '#FFDEEB' },
  { name: 'Cactus Canyon', emoji: '🌵', color: '#FFE8CC' },
  { name: 'Forest Falls', emoji: '🌳', color: '#C3FAE8' },
  { name: 'Rainbow Park', emoji: '🌈', color: '#E5DBFF' },
];

// Pipe openings as bits: up, right, down, left.
export const UP = 1;
export const RIGHT = 2;
export const DOWN = 4;
export const LEFT = 8;
const DIRS = [UP, RIGHT, DOWN, LEFT];
const OPPOSITE: Record<number, number> = { [UP]: DOWN, [RIGHT]: LEFT, [DOWN]: UP, [LEFT]: RIGHT };

/** A pipe turned clockwise by `turns` quarter turns. */
export const rotate = (mask: number, turns: number): number => {
  let m = mask;
  for (let k = 0; k < ((turns % 4) + 4) % 4; k++) m = ((m << 1) | (m >> 3)) & 15;
  return m;
};

export type PipeLevel = {
  number: number;
  rows: number;
  cols: number;
  rocks: boolean[]; // true = a rock, no pipe here
  solution: number[]; // pipe openings when solved
  start: number[]; // pipe openings at the start (turned at random)
  source: number; // the water tap's cell
  flowers: number; // dead ends, where flowers grow
  minTaps: number; // taps to solve if you never turn a tile too far
  starTaps: [number, number]; // most taps for 3 stars, for 2 stars
};

// Board size and rocks, by level.
const sizeFor = (n: number): { rows: number; cols: number; rocks: number } => {
  if (n <= 3) return { rows: 3, cols: 3, rocks: 0 };
  if (n <= 8) return { rows: 4, cols: 4, rocks: 0 };
  if (n <= 14) return { rows: 5, cols: 4, rocks: n >= 12 ? 1 : 0 };
  if (n <= 22) return { rows: 5, cols: 5, rocks: n >= 18 ? 2 : 1 };
  if (n <= 30) return { rows: 6, cols: 5, rocks: 2 };
  if (n <= 40) return { rows: 6, cols: 6, rocks: 3 };
  if (n <= 50) return { rows: 7, cols: 6, rocks: 3 };
  return { rows: 8, cols: 7, rocks: 4 };
};

const neighbour = (i: number, dir: number, rows: number, cols: number): number => {
  const r = Math.floor(i / cols);
  const c = i % cols;
  if (dir === UP) return r > 0 ? i - cols : -1;
  if (dir === DOWN) return r < rows - 1 ? i + cols : -1;
  if (dir === LEFT) return c > 0 ? i - 1 : -1;
  return c < cols - 1 ? i + 1 : -1;
};

const cache = new Map<number, PipeLevel>();

/** Level `n` (1-based): always the same board. */
export const getPipeLevel = (n: number): PipeLevel => {
  const hit = cache.get(n);
  if (hit) return hit;

  const { rows, cols, rocks: rockCount } = sizeFor(n);
  const size = rows * cols;
  const random = seededRandom(n * 6151 + 11);
  const pick = <T,>(list: T[]): T => list[Math.floor(random() * list.length)];

  for (;;) {
    // Tap somewhere away from the very edge when the board is big enough.
    const inner = Array.from({ length: size }, (_, i) => i).filter((i) => {
      const r = Math.floor(i / cols);
      const c = i % cols;
      return rows < 4 || (r > 0 && c > 0 && r < rows - 1 && c < cols - 1);
    });
    const source = pick(inner);

    // Rocks, keeping every other tile reachable.
    const rocks = Array<boolean>(size).fill(false);
    let placed = 0;
    for (let tries = 0; placed < rockCount && tries < 200; tries++) {
      const i = Math.floor(random() * size);
      if (i === source || rocks[i]) continue;
      rocks[i] = true;
      if (connectedCount(rocks, source, rows, cols) === size - placed - 1) placed++;
      else rocks[i] = false;
    }
    const open = size - placed;

    // A random tree of pipes from the tap that reaches every open tile.
    const solution = Array<number>(size).fill(0);
    const inTree = Array<boolean>(size).fill(false);
    inTree[source] = true;
    const edges: [number, number][] = [];
    const addEdges = (i: number) =>
      DIRS.forEach((d) => {
        const j = neighbour(i, d, rows, cols);
        if (j >= 0 && !rocks[j] && !inTree[j]) edges.push([i, d]);
      });
    addEdges(source);
    while (edges.length) {
      const k = Math.floor(random() * edges.length);
      const [i, d] = edges[k];
      edges.splice(k, 1);
      const j = neighbour(i, d, rows, cols);
      if (inTree[j]) continue;
      inTree[j] = true;
      solution[i] |= d;
      solution[j] |= OPPOSITE[d];
      addEdges(j);
    }

    // Turn every tile at random, and make sure there's plenty to do.
    for (let tries = 0; tries < 20; tries++) {
      const start = solution.map((m) => rotate(m, Math.floor(random() * 4)));
      let minTaps = 0;
      let wrong = 0;
      start.forEach((m, i) => {
        if (rocks[i]) return;
        const k = [0, 1, 2, 3].find((t) => rotate(m, t) === solution[i]) ?? 0;
        minTaps += k;
        if (k > 0) wrong++;
      });
      if (wrong < open * 0.6 || flow({ rows, cols, rocks, source } as PipeLevel, start).solved) continue;

      const flowers = solution.filter((m, i) => !rocks[i] && i !== source && DIRS.filter((d) => m & d).length === 1).length;
      const level: PipeLevel = {
        number: n,
        rows,
        cols,
        rocks,
        solution,
        start,
        source,
        flowers,
        minTaps,
        starTaps: [minTaps + Math.max(2, Math.ceil(minTaps * 0.25)), minTaps * 2 + 4],
      };
      cache.set(n, level);
      return level;
    }
  }
};

/** How many open tiles can be reached from `from`, walking around rocks. */
const connectedCount = (rocks: boolean[], from: number, rows: number, cols: number): number => {
  const seen = new Set([from]);
  const stack = [from];
  while (stack.length) {
    const i = stack.pop() as number;
    for (const d of DIRS) {
      const j = neighbour(i, d, rows, cols);
      if (j >= 0 && !rocks[j] && !seen.has(j)) {
        seen.add(j);
        stack.push(j);
      }
    }
  }
  return seen.size;
};

/**
 * Which tiles the water reaches with the pipes as they are now, and whether
 * the puzzle is solved (every tile watered and no pipe pointing at nothing).
 */
export const flow = (
  level: Pick<PipeLevel, 'rows' | 'cols' | 'rocks' | 'source'>,
  masks: number[]
): { watered: boolean[]; solved: boolean } => {
  const { rows, cols, rocks, source } = level;
  const joined = (i: number, d: number) => {
    const j = neighbour(i, d, rows, cols);
    return j >= 0 && !rocks[j] && (masks[i] & d) !== 0 && (masks[j] & OPPOSITE[d]) !== 0 ? j : -1;
  };
  const watered = Array<boolean>(masks.length).fill(false);
  watered[source] = true;
  const stack = [source];
  while (stack.length) {
    const i = stack.pop() as number;
    for (const d of DIRS) {
      const j = joined(i, d);
      if (j >= 0 && !watered[j]) {
        watered[j] = true;
        stack.push(j);
      }
    }
  }
  const solved = masks.every(
    (m, i) => rocks[i] || (watered[i] && DIRS.every((d) => (m & d) === 0 || joined(i, d) >= 0))
  );
  return { watered, solved };
};

/** Taps needed to turn tile i from `mask` to its answer (0-3). */
export const tapsToFix = (level: PipeLevel, i: number, mask: number): number =>
  [0, 1, 2, 3].find((t) => rotate(mask, t) === level.solution[i]) ?? 0;

export const starsForTaps = (level: PipeLevel, taps: number, hints: number): number => {
  const stars = taps <= level.starTaps[0] ? 3 : taps <= level.starTaps[1] ? 2 : 1;
  return hints > 0 ? Math.min(stars, 2) : stars;
};
