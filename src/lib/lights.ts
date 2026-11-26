// Light Switch: a grid of lamps. Tapping a lamp flips it and the lamps
// above, below, left and right of it. Turn every lamp on to win.
//
// Each level starts with every lamp on, then some lamps are "tapped" at random
// to switch some off, so every level can be solved. The solver finds the
// fewest taps from any position (it is a set of on/off equations, solved
// with XOR), which gives the 3-star target and the hints.

import { seededRandom } from './random';

export const LIGHTS_LEVEL_COUNT = 60;
export const LIGHTS_LEVELS_PER_WORLD = 10;

export const LIGHTS_WORLDS = [
  { name: 'Bedtime Lamps', emoji: '💡', color: '#FFF3BF' },
  { name: 'Firefly Field', emoji: '✨', color: '#E9FAC8' },
  { name: 'Lantern Street', emoji: '🏮', color: '#FFE3E3' },
  { name: 'Starry Sky', emoji: '⭐', color: '#E5DBFF' },
  { name: 'Moon Bay', emoji: '🌙', color: '#D0EBFF' },
  { name: 'Rainbow Glow', emoji: '🌈', color: '#FFDEEB' },
];

export type LightsLevel = {
  number: number;
  size: number; // the grid is size x size
  start: boolean[]; // true = lamp on
  par: number; // fewest taps to light everything
};

/** The lamps a tap on `i` flips: itself and its four neighbours. */
export const reach = (i: number, size: number): number[] => {
  const r = Math.floor(i / size);
  const c = i % size;
  const out = [i];
  if (r > 0) out.push(i - size);
  if (r < size - 1) out.push(i + size);
  if (c > 0) out.push(i - 1);
  if (c < size - 1) out.push(i + 1);
  return out;
};

/** The lamps after tapping `i`. */
export const tap = (lamps: boolean[], i: number, size: number): boolean[] => {
  const next = [...lamps];
  for (const j of reach(i, size)) next[j] = !next[j];
  return next;
};

/**
 * The fewest lamps to tap (each once) to turn every lamp on, or null if it
 * can't be done. Solves "taps touching lamp j, plus 1 if j is off, is even"
 * for every lamp j, then tries every free choice for the smallest answer.
 */
export const solve = (lamps: boolean[], size: number): number[] | null => {
  const n = size * size;
  // rows[j] = [coefficients for taps 0..n-1, right-hand side]
  const rows = Array.from({ length: n }, (_, j) => {
    const row = Array<number>(n + 1).fill(0);
    for (const i of reach(j, size)) row[i] = 1; // tapping i flips j (reach is symmetric)
    row[n] = lamps[j] ? 0 : 1;
    return row;
  });

  const pivotCols: number[] = [];
  let r = 0;
  for (let c = 0; c < n && r < n; c++) {
    const p = rows.findIndex((row, k) => k >= r && row[c] === 1);
    if (p < 0) continue;
    [rows[r], rows[p]] = [rows[p], rows[r]];
    for (let k = 0; k < n; k++) {
      if (k !== r && rows[k][c] === 1) for (let x = 0; x <= n; x++) rows[k][x] ^= rows[r][x];
    }
    pivotCols.push(c);
    r++;
  }
  // A row of all zeros that still needs a 1: impossible.
  for (let k = r; k < n; k++) if (rows[k][n] === 1) return null;

  const isPivot = new Set(pivotCols);
  const free = Array.from({ length: n }, (_, c) => c).filter((c) => !isPivot.has(c));
  let best: number[] | null = null;
  for (let mask = 0; mask < 1 << free.length; mask++) {
    const x = Array<number>(n).fill(0);
    free.forEach((c, k) => {
      x[c] = (mask >> k) & 1;
    });
    pivotCols.forEach((c, k) => {
      let v = rows[k][n];
      for (const f of free) if (rows[k][f]) v ^= x[f];
      x[c] = v;
    });
    const taps = x.map((v, i) => (v ? i : -1)).filter((i) => i >= 0);
    if (!best || taps.length < best.length) best = taps;
  }
  return best;
};

// Grid size and how many lamps are scrambled, by level.
const shapeFor = (n: number): { size: number; scramble: [number, number] } => {
  if (n <= 5) return { size: 3, scramble: [1, 3] };
  if (n <= 12) return { size: 4, scramble: [3, 5] };
  if (n <= 24) return { size: 5, scramble: [4, 7] };
  if (n <= 36) return { size: 5, scramble: [6, 9] };
  if (n <= 48) return { size: 6, scramble: [7, 10] };
  return { size: 6, scramble: [9, 13] };
};

const cache = new Map<number, LightsLevel>();

/** Level `n` (1-based): always the same lamps. */
export const getLightsLevel = (n: number): LightsLevel => {
  const hit = cache.get(n);
  if (hit) return hit;
  const { size, scramble } = shapeFor(n);
  const random = seededRandom(n * 4243 + 7);
  const cells = size * size;

  for (;;) {
    const count = scramble[0] + Math.floor(random() * (scramble[1] - scramble[0] + 1));
    let lamps = Array<boolean>(cells).fill(true);
    const picked = new Set<number>();
    while (picked.size < Math.min(count, cells)) picked.add(Math.floor(random() * cells));
    picked.forEach((i) => {
      lamps = tap(lamps, i, size);
    });
    const answer = solve(lamps, size);
    // Skip boards that came out already lit, or far easier than planned.
    if (!answer || answer.length < Math.max(1, scramble[0] - 1)) continue;
    const level = { number: n, size, start: lamps, par: answer.length };
    cache.set(n, level);
    return level;
  }
};

export const starsForTaps = (level: LightsLevel, taps: number, hints: number): number => {
  const stars = taps <= level.par ? 3 : taps <= level.par * 2 + 2 ? 2 : 1;
  return hints > 0 ? Math.min(stars, 2) : stars;
};
