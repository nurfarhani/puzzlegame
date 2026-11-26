// Color Flood: the paint starts in the top-left corner. Pick a colour and the
// paint spreads into every touching square of that colour. Fill the whole
// board with one colour before the moves run out.
//
// Each level is a random board from a seed. A careful helper (it looks two
// moves ahead) plays every level first; its move count is the 3-star target,
// and the move limit adds a few spare moves on top.

import { seededRandom } from './random';

export const FLOOD_LEVEL_COUNT = 60;
export const FLOOD_LEVELS_PER_WORLD = 10;

export const FLOOD_WORLDS = [
  { name: 'Paint Pots', emoji: '🎨', color: '#FFE3E3' },
  { name: 'Candy Shop', emoji: '🍬', color: '#FFDEEB' },
  { name: 'Ocean Waves', emoji: '🌊', color: '#D0EBFF' },
  { name: 'Parrot Jungle', emoji: '🦜', color: '#D3F9D8' },
  { name: 'Sunset Sky', emoji: '🌅', color: '#FFE8CC' },
  { name: 'Rainbow Road', emoji: '🌈', color: '#E5DBFF' },
];

/** The paints, with a shape each so colours can be told apart without colour. */
export const PAINTS = [
  { color: '#FF6B6B', name: 'Red', shape: '●' },
  { color: '#FFD43B', name: 'Yellow', shape: '▲' },
  { color: '#51CF66', name: 'Green', shape: '■' },
  { color: '#4DABF7', name: 'Blue', shape: '◆' },
  { color: '#B197FC', name: 'Purple', shape: '★' },
  { color: '#FF922B', name: 'Orange', shape: '♥' },
];

export type FloodLevel = {
  number: number;
  size: number; // size x size board
  colors: number; // how many paints are used
  start: number[]; // paint index of each square
  par: number; // the helper's moves: 3 stars at or under this
  limit: number; // most moves allowed
};

const neighbours = (i: number, size: number): number[] => {
  const r = Math.floor(i / size);
  const c = i % size;
  const out: number[] = [];
  if (r > 0) out.push(i - size);
  if (r < size - 1) out.push(i + size);
  if (c > 0) out.push(i - 1);
  if (c < size - 1) out.push(i + 1);
  return out;
};

/** The squares joined to the top-left corner by its colour. */
export const region = (board: number[], size: number): Set<number> => {
  const color = board[0];
  const inside = new Set<number>([0]);
  const queue = [0];
  for (let k = 0; k < queue.length; k++) {
    for (const j of neighbours(queue[k], size)) {
      if (!inside.has(j) && board[j] === color) {
        inside.add(j);
        queue.push(j);
      }
    }
  }
  return inside;
};

/** The board after pouring `color` into the corner region. */
export const pour = (board: number[], size: number, color: number): number[] => {
  if (board[0] === color) return board;
  const inside = region(board, size);
  return board.map((v, i) => (inside.has(i) ? color : v));
};

export const isDone = (board: number[]): boolean => board.every((v) => v === board[0]);

/** The helper's choice: the colour that grows the paint the most, looking two moves ahead. */
export const bestColor = (board: number[], size: number, colors: number): number => {
  let best = -1;
  let bestScore = -1;
  for (let a = 0; a < colors; a++) {
    if (a === board[0]) continue;
    const once = pour(board, size, a);
    let score = region(once, size).size * 2;
    if (isDone(once)) score = Number.MAX_SAFE_INTEGER;
    else {
      let ahead = 0;
      for (let b = 0; b < colors; b++) {
        if (b === a) continue;
        ahead = Math.max(ahead, region(pour(once, size, b), size).size);
      }
      score += ahead;
    }
    if (score > bestScore) {
      bestScore = score;
      best = a;
    }
  }
  return best;
};

/** Moves the helper needs to fill a board. */
export const helperMoves = (board: number[], size: number, colors: number): number => {
  let b = board;
  let moves = 0;
  while (!isDone(b) && moves < 200) {
    b = pour(b, size, bestColor(b, size, colors));
    moves++;
  }
  return moves;
};

// Board size, colours and spare moves, by level.
const shapeFor = (n: number): { size: number; colors: number; spare: number } => {
  if (n <= 5) return { size: 6, colors: 3, spare: 4 };
  if (n <= 12) return { size: 7, colors: 4, spare: 4 };
  if (n <= 20) return { size: 8, colors: 4, spare: 3 };
  if (n <= 30) return { size: 9, colors: 5, spare: 3 };
  if (n <= 40) return { size: 10, colors: 5, spare: 3 };
  if (n <= 50) return { size: 11, colors: 6, spare: 2 };
  return { size: 12, colors: 6, spare: 2 };
};

const cache = new Map<number, FloodLevel>();

/** Level `n` (1-based): always the same board. */
export const getFloodLevel = (n: number): FloodLevel => {
  const hit = cache.get(n);
  if (hit) return hit;
  const { size, colors, spare } = shapeFor(n);
  const random = seededRandom(n * 3571 + 3);
  const start = Array.from({ length: size * size }, () => Math.floor(random() * colors));
  const par = helperMoves(start, size, colors);
  const level = { number: n, size, colors, start, par, limit: par + spare };
  cache.set(n, level);
  return level;
};

export const starsForMoves = (level: FloodLevel, moves: number, hints: number): number => {
  const stars = moves <= level.par ? 3 : moves <= level.par + 1 ? 2 : 1;
  return hints > 0 ? Math.min(stars, 2) : stars;
};
